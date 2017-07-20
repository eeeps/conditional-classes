# poofquery
It's a poof of concept.

I made this to experiment with and learn about container queries. If you want to use container queries in production, you should probably be using [something](https://github.com/eqcss/eqcss) [else](https://github.com/ausi/cq-prolyfill).

## Requirements

`poofquery.js` requires [ResizeObserver](https://github.com/WICG/ResizeObserver), which is currently only implemented behind a flag in Chrome. Luckily, there’s an excellent [polyfill](https://github.com/que-etc/resize-observer-polyfill).

## Usage

Load `poofquery.js` in the `<head>`, after any ResizeObserver polyfill, synchronously.

```html
<head>
	<!-- (head stuff) -->
	<script src="ResizeObserverPolyfill.js"></script>
	<script src="poofquery.js"></script>
</head>
```

Then use it like this:

```css
.container {
	---poofpoints: 10em .medium 20em .large;
}

.container.medium .element { /* equivalent to .element:container( 10em <= width < 20em ) */
	/* do container query stuff */
}

.container.large .element { /* equivalent to .element:container( width > 20em ) */
	/* do some other container query stuff */
}
```
