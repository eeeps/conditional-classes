# conditional-classes

I made this to experiment with and learn about container queries. If you want to use container queries in production, you should probably be using [something](https://github.com/eqcss/eqcss) [else](https://github.com/ausi/cq-prolyfill).


## Requirements   

`conditional-classes.js` requires [ResizeObserver](https://github.com/WICG/ResizeObserver), which is currently only implemented behind a flag in Chrome. Luckily, there’s an excellent [polyfill](https://github.com/que-etc/resize-observer-polyfill).


## Usage

Load `conditional-classes.js` in the `<head>`, after any ResizeObserver polyfill, synchronously.

```html
<head>
	<!-- (head stuff) -->
	<script src="ResizeObserverPolyfill.js"></script>
	<script src="conditional-classes.js"></script>
</head>
```

Then use it like this:

```css
.container {
	--conditional-classes: (width > 300px) and (width <= 600px) .medium,
	                       (width > 600px) .large;
}

.container.medium .element { /* applies when .container’s width is between 300px and 600px */
	/* do container query stuff */
}

.container.large .element { /* applies when .container’s width is > 600px  */
	/* do some other container query stuff */
}
```

Currently supports querying the `width`, `height`, and `aspect-ratio` of elements.

## TODO

- [ ] `eval( eval() )` 😂😱🚨 lol the “parsing” of this microsyntax is a giant unsafe hack right now do not use this in production *anywhere* right now, ok? promise‽
- [ ] support length units other than `px`
- [ ] once ResizeObserver does, support querying different rects?
- [ ] full Media Queries Level 4 range syntax, e.g. `(400px < width <= 900px)`

