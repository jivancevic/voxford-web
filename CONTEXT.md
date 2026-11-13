# Voxford website

The public website of Voxford, a Croatian a cappella group. It shows who the group is and turns visitors into booking inquiries, in English (canonical) and Croatian. The words below are the ones the site's copy and code use; they come from the group's private knowledge base (`~/projects/business/voxford/CONTEXT.md`), which wins where the two differ.

## The group

**Voxford**:
A Croatian a cappella group of five singers from Zagreb, founded in 2021, that blends modern a cappella with the Dalmatian klapa sound. In copy, the first mention on a page is "Voxford, a cappella group from Zagreb, Croatia" (vOx Chamber Choir, Oxford, is a different group).
_Avoid_: klapa (Voxford borrows the klapa sound but is not one), band, choir

**The five** (HR **petorka**):
The five permanent singers, in stage order from the audience: Josip, Dora, Ante, Vita, David.
_Avoid_: members (when only the singers are meant)

**Instrumentalist**:
A player who joins the five: piano and cajón in GOLD. Changes from gig to gig and is never named on the site.

**Manager** (HR **menadžerica**):
Jelena Đukanović of WAM Management, who handles bookings and offers. The site names her; inquiries still go to the group's address.
_Avoid_: agent, booker

## Booking

**Inquiry** (HR **upit**):
A visitor's request to book Voxford for a date, place and occasion. The one action every page leads to; it always goes to voxford.official@gmail.com.
_Avoid_: contact form, quote request, booking (an inquiry is not yet a booking)

**Prefill**:
The inquiry fields a link carries in its query string (`type`, `date`, `city`, `package`) so the form opens filled in. The contract is in `docs/spec.md`.

**Package** (HR **paket**):
One of the three standard offers: **POP-UP** (up to 15 min, ceremonial), **CLASSIC** (45–60 min a cappella concert), **GOLD** (90–120 min, the five with piano and cajón). Names are written in capitals, in English, in both languages. The site never shows a price.
_Avoid_: BASIC (CLASSIC's old name), POP UP without the hyphen, tier, plan

**Travel costs** (HR **putni troškovi**):
The cost of the crew's trip from Zagreb and back, always separate from the package.
_Avoid_: "travel included"

**Event type**:
The occasion an inquiry is for: conference, wedding, advent, concert, other. Conferences and corporate events are the site's primary audience.

**Corporate event** (HR **korporativni event**):
A company's own event Voxford sings at (an anniversary, a gala, an awards night, a Christmas party), sold together with conferences on one page. HR copy says "korporativni event(i)", the words organizers type and the pages AI answers cite (#122).
_Avoid_: poslovni događaj (HR)

**Reference** (HR **referenca**):
An organisation Voxford performed for or worked with (a company, a city or tourist board, an institution, a festival, a stage it was invited onto, an artist who invited them), shown by name and logo, or by name when no clean official logo exists. Private clients are never references.
_Avoid_: client (includes people who only asked), partner

**Public concert**:
A performance anyone can attend: Advent, summer and festival concerts. Only these appear under upcoming concerts; corporate and private gigs never do.

## The site

**Site facts**:
The numbers, profiles, members and packages the site states, held in one file (`src/data/site-facts.ts`) with the date they were checked. Copy, JSON-LD and `llms.txt` all read from it.

**Page key**:
The language-neutral name of a page (`conferences`, `weddings`, …) in the route table; each has a path per language.

**Stage Light Varsity**:
The visual language: photography carries the page, the brand colours (pink → purple → blue) behave as stage light (thin lines, glow, gradient), never as a flat fill; a near-black base; one forte per screen; the crest worn as a seal.
