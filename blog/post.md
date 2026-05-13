# Building a Flight Price Comparison Tool with Claude Code

*Sparsh Kapoor — March 26, 2026*

---

## Table of Contents
1. [The Idea](#the-idea)
2. [Repo Building](#repo-building)
3. [Is Everything Correct?](#is-everything-correct)
4. [Usage Limits](#usage-limits)
5. [What's Next](#whats-next)

---

## TL;DR — Common Problems & Fixes

Here's a quick rundown of the problems and solutions I experienced before the actual blog post:

**Docker won't start** — you probably have a native Postgres already running on port 5432.
Fix: change the port mapping in `docker-compose.yml` to `5433:5432` and update `DATABASE_URL` in `.env`.

**Server crashes on startup** — `.env` isn't loading. Make sure `import 'dotenv/config'` is the very first line in `src/index.ts`, before any other imports.

**Search submits but no flights ever appear** — the BullMQ worker wasn't being started.
Fix: call `createSearchWorker()` in your server bootstrap. Jobs queue silently and sit there forever if nothing's consuming them.

**SerpAPI returns nothing / wrong results** — `travel_class` must be numeric (1/2/3/4), and dates must be `YYYY-MM-DD` strings.

**Comparison shows the same flights on both sides** — SerpAPI's round-trip mode is a two-step token flow. Switch to two separate one-way calls (outbound + return) so both legs are independent.

**Filters do nothing** — the store had all the state but the results page wasn't applying it. Double-check that your filter logic actually runs against the displayed list, not just updates state.

**Port 3001 already in use on restart** — a stale process from the last session.
Fix: `lsof -ti:3001 | xargs kill -9` before running `npm run dev`.

---

## The Idea

When my family and I were booking flights to India for a summer wedding, we realized that a one-way ticket combo is cheaper than any round-trip price we could find. I wondered why there wasn't a tool to compare one way vs. round-trip ticket prices on any travelling website, as in instances like these, we saved around $200 each.

I decided I wanted to create the whole thing using a combination of GitHub Copilot and Claude Code. Every feature, every bug fix, almost every line of code was written by Claude, double checked by me (which I learned is very important). This post walks through how that went.

### The Stack

- **Frontend**: React 18, Vite, TailwindCSS, Zustand, React Query
- **Backend**: Express, Prisma ORM, PostgreSQL, Redis, BullMQ
- **Shared**: TypeScript monorepo with npm workspaces, Zod schemas
- **Data**: SerpAPI Google Flights API (free tier: 250 searches/month)

---

## Repo Building

When creating my repository for the project, I noticed at the bottom of the creation page that there was a small text box to enter a prompt for Github Copilot. Intrigued, I thought about it and decided to prompt-engineer my first draft of what I wanted this project to be. I very quickly realized that I was not going to hit the 30,000 character limit if I were to prompt it myself, so I decided to prompt Claude:

I want to build an application (whether it's web-based or iOS-based) that web-scrapes flight information, very similar to Google Flights, and has high customizability. Its primary objective is to leverage an AI/LLM (such as OpenClaw) to compare flight information between round-trip vs. one-way, and be able to quickly compare this information efficiently and effectively. Customizability should include how many layovers someone should have and where, adjustability on overall flight time, and things like that. Make a basic repo setup for this.
I am giving Copilot a prompt that has a limit of 30k characters. Give a very long prompt that is very in-depth about the type of app I want to build to give Copilot, based on the paragraph I wrote above. I want it to be a BASIC repository setup, as I will not be using Copilot for the actual LLM work.

In 45 mins, Copilot (model: Sonnet 4.5) wrote over 13k lines of code, staged and pushed multiple commits, and built a Google Flights-like website that almost looked exactly like what I was looking for on its very first try.

To say I was very impressed is an understatement. It would have taken me days to come up with 1/4 of the amount of logic and styling required to make a website like this. The ease at which Claude delivered a near perfect prompt from my shallow and not very detailed prompt showed me the usefulness of prompting LLMs for LLMs! However, it wasn't all sunshine and rainbows, and it had a good amount of initial issues.

<!-- Screenshot: homepage with search form -->

### Infrastructure Issues

While I felt it built a professional tech stack, Copilot's code still lacked the proper database connections and validations. Docker Compose failed immediately, and there were several issues with not seeing data in Redis. This is where I transitioned to Claude Code (Sonnet 4.6 + Opus 4.6 extended).

To contextualize Claude about my database into a more digestible, less context heavy way, I decided to use repomix. In my terminal, I typed the command "npx repomix@latest", and it created an XML detailing the format, and easily digestible purpose and format statements to help Claude navigate the project. After giving it the file to read and asking it to figure out why my Docker kept failing, it quickly found the conflict and remapped the Docker container to port 5433. I made a point to not let it automatically make edits, which was a smart decision as I found out later.

### The Missing Pieces

The website looked great, but none of the features I wanted actually functioned, and the server kept crashing and not launching. Claude was able to build the infrastructure and the layout and include the features visually, but crucially couldn't deliver on a working alpha-level prototype.

Copilot set up Zod validation for environment variables but never installed `dotenv`. Nothing was loading the `.env` file into `process.env`. Again, I wanted to see the debugging skills of Claude; after asking it to fix whatever problems there were it found it instantly, installed the package, and added a single import line. It was something about the order of imports, something I didn't bother to check when Claude wrote the initial code. I started realizing that re-reading the thousands of lines that Copilot and Claude wrote together would be crucial to figure out where these types of weird bugs are.

<!-- Screenshot: claude page with the docker thing -->

Another weird bug was when I was submitting a search. It would appear in the database and the job would get queued, but no flights would show up. I decided to copy the job queries and take a screenshot of the webpage not showing any flights. One thing that was interesting was that the page kept refreshing and resubmitting jobs, as if some API hit was failing and it was trying to rehit the API. While I had that thought within seconds of seeing the page refresh, I didn't mention anything other than the page was simply refreshing over and over again with no flights populating the page.

I must have prompted Claude three or four times with different error descriptions before it finally found it: a worker function that was never called anywhere even though it was written. Jobs went into the queue and just sat there with nothing consuming them.

Realizing that Claude's code can look complete and still be fundamentally broken was an important lesson I learned in college. Copilot wrote the worker, wrote the queue, wrote the job processor — but never actually connected them. Nowadays I'm hearing a lot of stories about developers using GenAI code in production, with it being incomplete/broken while looking completely viable, and it completely backfiring. The importance of GenAI code review can't be overstated.

By the end of this first session with Claude Code, the app ran end-to-end on mock data. You could search, see flights, filter results, and view the comparison analysis. It felt like a real product. The only problem is that it was all fake, and I realized that I never gave Claude a specific instruction to find an API that would use real flight data. Once the basics worked, I swapped the mock scraper for a real SerpAPI endpoint — which opened a whole new set of problems.

---

## Is Everything Correct?

It was becoming evident that Claude changed your code so fast that code review is not only necessary, but a skill you need to learn. I went through the codebase looking for any code flaws — basic errors, queries leaking to the frontend, broken features from not parsing the SerpAPI responses properly.

Almost every parameter being sent to SerpAPI was wrong — cabin class was being sent as a string when it needed to be a number, and dates were being serialized as full timestamps instead of `YYYY-MM-DD`. The most interesting one was that SerpAPI's round-trip mode is actually a two-step token exchange, so the scraper was only returning outbound flights with zero return flights, making the whole comparison engine useless. We ended up switching to two separate one-way calls instead.

The original comparison engine had a fabricated 10% round-trip discount baked in, which made no sense — both sides of the comparison were showing the exact same flights with just a different multiplier on the price. We scrapped it and reframed the whole thing: the real comparison worth making is same-airline both legs versus the cheapest mix-and-match across carriers, which is actually how people book flights.

The filter sidebar looked functional but almost none of it actually worked — filters were defined in state but never applied to the results list, and the layover filter was comparing a stop count against a boolean. There was also a surprising amount of TypeScript errors, which was actually great for learning the language. Each of these was a 5-minute fix for Claude, but finding them all took a full session. Essentially, AI can write code fast, but you still need to use the product yourself to find what's actually broken.

<!-- Screenshot: comparison view showing Same Airline vs Best Mix with real prices -->

---

## Usage Limits

This is where I had to start thinking like a real developer. The SerpAPI free tier gives 250 searches per month. That sounds like a lot until you realize you need to make **two** API calls per search (one for outbound flights, one for return), so it's really 125 searches. And since I was planning to put this on the internet for this blog post, anyone who found the site could burn through my entire monthly quota.

I didn't even think of this until I asked Claude to connect the SerpAPI endpoint. Claude wouldn't put safeguards on API endpoints unless I specifically asked it to, and there could have been a real possibility of me getting an insane bill by some troll hitting the search button a billion times. After some rudimentary research, I found and told Claude about a couple of rate limiting methods that were common practice. I felt like a real developer for nearly the first time in the whole project, and despite me not writing any of the actual code, it made me feel like I knew the resources and tools needed to get exactly what I wanted — so I can focus on what Claude is best for: following instructions and writing code based on those instructions.

One advantage of telling Claude about rate limiting ideas and giving it more freedom on the best policy to implement allowed it to design something I wouldn't have thought of: a fail-open policy. If Redis goes down, the rate limiter lets requests through instead of blocking everything. This seemed like a more professional approach, sacrificing some API requests instead of showing users errors, which are practices I would only get through experience.

<!-- Screenshot: 429 error displayed on the search form -->

---

## What's Next

While I had a basic engine to compare flight prices, none of it required any form of LLM/AI involvement to help the user find the best price possible. I wanted this to be a project to leverage an LLM to teach myself about different use cases, and explore its limits and boundaries. I asked Claude what the best ways to implement an LLM to maximize efficiency, but minimize cost in training time, if that was even necessary. It said:

> The app already computes round-trip vs one-way price differences, but an LLM could factor in soft things like luggage policy differences, change fee risks, and whether the routing makes sense for the dates.

That was exactly what I was looking for — it eliminated the need of having to train/fine-tune an LLM by myself, which isn't necessary for most cases of LLM implementation, and was a cheap, easy, and fantastic way to use an LLM effectively.

Building this project is teaching me more about the importance of code verification and the proper use case of LLM implementation. Copilot and Claude Code can produce thousands of lines of working-looking code in minutes, but "working-looking" and "working" are very different things. I plan to implement the LLM by webscraping a ton of old flight data and using that as a RAG database, which is actively in progress, and I'm excited to continue to use Claude Code as much as possible to further develop my projects.

The repo is at [github.com/sparshkapoor/flightselect](https://github.com/sparshkapoor/flightselect).
