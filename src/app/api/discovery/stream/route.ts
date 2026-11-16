import { NextRequest } from "next/server";
import { getProfile } from "@/lib/profile-storage";
import { runPersonalizedDiscovery, DiscoveryStreamEvent } from "@/lib/discovery/runner";
import { DiscoverySourceId } from "@/types/profile";
import { requireUser } from "@/lib/require-user";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
    const body = await req.json().catch(() => ({}));
    let profile = await getProfile(user.id);

    if (body.profile) {
      profile = { ...profile, ...body.profile };
    }

    if (!profile || !profile.isConfirmed) {
      return new Response(
        JSON.stringify({
          error: "Profile not confirmed",
          message: "Please complete and confirm your discovery profile before initiating opportunity discovery.",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Determine sources to run
    let sourceIds: DiscoverySourceId[] = body.sourceIds;
    if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
      sourceIds = ["internshala", "unstop", "devfolio", "luma"];
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: DiscoveryStreamEvent) => {
          try {
            const payload = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {
            // client disconnected
          }
        };

        try {
          const result = await runPersonalizedDiscovery(profile!, sourceIds, user.id, (event) => {
            sendEvent(event);
          });

          // Final event with complete payload
          sendEvent({
            type: "complete",
            message: result.summaryMessage,
            data: result,
            timestamp: new Date().toISOString(),
          });

          controller.close();
        } catch (err: any) {
          sendEvent({
            type: "error",
            message: err?.message || "Discovery process encountered an error",
            timestamp: new Date().toISOString(),
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    console.error("Discovery stream API error:", err);
    return new Response(
      JSON.stringify({
        error: "Discovery stream initialization failed",
        message: err?.message || "Unexpected server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
