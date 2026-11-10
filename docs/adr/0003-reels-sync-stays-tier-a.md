# The reels sync keeps the site Tier A

A daily cron that pulls the latest reels from the Instagram API into R2 and triggers a rebuild is "ingesting external data", which by the kickstart walk would make this a Tier B app with a full test suite. We keep Tier A: the sync is one path with its own tests (ticket E), the page renders without the feed when the API is down, and nothing the sync stores is data we would be upset to lose (Instagram keeps the originals). The inquiry endpoint is the other dynamic path and gets the same treatment.
