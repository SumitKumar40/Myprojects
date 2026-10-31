# Retro Rags - Vintage Thrift Store Catalog

A front-end website for a vintage thrift store. Shoppers can browse 30 one-of-a-kind
pre-loved items from the 70s, 80s, 90s and Y2K, and narrow them down using many
filters at the same time.

Built with **only HTML, CSS and plain JavaScript**. No frameworks, no build tools,
no backend and no database.

---

## How to run it

1. Download or copy the whole project folder.
2. Double-click **`index.html`**. It opens in your web browser.
3. That's it! (You need an internet connection for the fonts, icons and product photos.
   If a photo can't load, a colourful placeholder appears instead.)

---

## Project files

| File | What it does |
|------|--------------|
| `index.html` | The page structure: navbar, hero, marquee, filter panel, product grid, modal, footer |
| `css/style.css` | All the styling. Colours and fonts are stored as CSS variables at the top (`:root`) |
| `js/data.js` | The list of 30 products (an array of objects). No logic, just data |
| `js/script.js` | All the logic: filters, sorting, chips, wishlist, Quick View, drawer, back-to-top |
| `README.md` | This file |

---

## How the filtering works (simple explanation)

All the shopper's choices are stored in **one JavaScript object** called `filters`:

```js
filters = {
  categories: ['Jackets'],   // ticked checkboxes
  sizes: ['M', 'L'],         // selected size pills
  eras: ['90s'],
  conditions: [],
  colors: [],
  gender: 'All',
  minPrice: 0,
  maxPrice: 5000,
  search: '',
  wishlistOnly: false
}
```

Whenever the shopper clicks, ticks, types or drags anything, we:

1. **Update the `filters` object** (for example, add `'M'` to `sizes`).
2. **Call `applyFilters()`**, which:
   - goes through every product and keeps only the ones where `matchesFilters(product)` is `true`
   - sorts them with `sortProducts()`
   - redraws the cards, the "Showing X of 30 items" text and the chips.

### OR inside a group, AND between groups

`matchesFilters(product)` checks each filter group one by one, using a small helper:

```js
function passesGroup(selectedList, productValue) {
  if (selectedList.length === 0) return true;   // nothing chosen = everything passes
  return selectedList.includes(productValue);   // matches ANY chosen option = OR
}
```

- **OR inside one group:** if sizes `M` and `L` are selected, a product passes the size
  check if its size is M **or** L.
- **AND between groups:** the product must pass the category check **and** the size check
  **and** the era check **and** the price check... If **any** check fails, the function
  returns `false` straight away and the product is hidden.

Example: *Jackets + size M + 90s* shows only items that are a jacket AND size M AND from the 90s.

### Search
The typed text is turned into lowercase and we check whether the product's
name + brand + description (also lowercase) **contains** it. So "LEVI" finds "Levi's".

### Chips and Clear all
- Chips are made from the `filters` object, one chip per active filter.
  Clicking the X removes that one value and runs `applyFilters()` again.
- "Clear all" / "Reset" replaces `filters` with a fresh empty object from
  `getDefaultFilters()`, so every product shows again.
- `syncFilterControls()` makes the checkboxes, pills and sliders always match the
  `filters` object, even when a filter is removed from a chip.

---

## Features

**Filters (all work together, instantly, without reloading)**
- Category (checkboxes)
- Size (pill buttons)
- Era / decade (pill buttons)
- Condition (checkboxes)
- Gender (pill buttons, one at a time)
- Colour (clickable swatches)
- Price range (min and max sliders, min can never go above max)
- Search box in the navbar (searches name, brand and description)
- Number of items shown next to each filter option

**Results**
- Sort by: Featured, Price low to high, Price high to low, Newest, Biggest discount
- Live result count: "Showing 12 of 30 items"
- Active filter chips with X buttons, plus a "Clear all" chip
- "No treasures found" empty state with a Reset button
- Cards fade in one after another when results change

**Extras**
- Wishlist heart on every card, saved in `localStorage` (stays after a refresh)
- Wishlist counter in the navbar; clicking it shows only wishlist items
- Quick View pop-up with a big image and all product details (closes with X, Esc or clicking outside)
- "Jump to an era" buttons in the hero
- Back to top button
- Mobile / tablet: filters slide in from the side in a drawer
- Image fallback: if a photo fails, a colourful placeholder with an icon is shown

**Design**
- Retro thrift-shop theme: cream, mustard, terracotta, deep teal and dark brown
- Fonts: Abril Fatface (headings) and DM Sans (body) from Google Fonts
- Sticky navbar, sunburst hero with a polaroid collage, scrolling marquee strip
- Cards with rounded corners, shadows, hover lift, image zoom, era and condition badges,
  crossed-out original price and a "% OFF" tag
- CSS Grid for the product grid, Flexbox for rows of items
- Fully responsive (mobile, tablet, desktop)

**Accessibility**
- Alt text on every product image
- Labels on all inputs, buttons usable with the keyboard, visible focus outline
- "Skip to products" link, `aria-pressed` on toggle buttons, live result count for screen readers
- Animations are turned off for users who prefer reduced motion

---

## Credits
- Product photos: [Unsplash](https://unsplash.com)
- Icons: [Font Awesome](https://fontawesome.com)
- Fonts: [Google Fonts](https://fonts.google.com)