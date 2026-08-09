import OpenAI from "openai";
import { env } from "../config/env";

// The SDK defaults are a 10-minute timeout and 2 internal retries. Both generators sit under
// their own 3-attempt quality-retry loop and the exercise route fans out with concurrency 3, so
// those defaults let a single stalled request hold sockets open — and keep burning quota — for
// hours after the browser has given up. One minute is well past the p99 for these completions.
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  timeout: 60_000,
  maxRetries: 1,
});
