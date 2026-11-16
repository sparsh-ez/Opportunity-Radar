import { Client } from "@notionhq/client";

const notion = new Client({ auth: "dummy" });
console.log("Client methods:");
console.log("databases:", Object.getOwnPropertyNames(Object.getPrototypeOf(notion.databases)));
console.log("pages:", Object.getOwnPropertyNames(Object.getPrototypeOf(notion.pages)));
console.log("blocks:", Object.getOwnPropertyNames(Object.getPrototypeOf(notion.blocks)));
console.log("search:", typeof notion.search);

