import { Inngest } from "inngest";

export const inngest = new Inngest({ 
  id: "bailnotarie",
  name: "BailNotarie",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

