# The site is its own public repo, not `web/` in the private KB

The site lives in `jivancevic/voxford-web`, public, instead of a folder in the private Voxford KB. A public repo gets free GitHub Actions minutes, real branch protection and auto-merge on the free plan, and keeps the site physically apart from contracts, OIB, IBAN and prices, which must never be published. The cost: the KB stays the source of truth, so a fact change (a new number, a new reference) is a follow-up PR here, and nothing secret or private may ever be copied in.
