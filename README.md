# presto-points
*Presto change-o,* it’s element/container queries.

I made this to experiment with and learn about container queries. If you want to use container queries in production, you should probably be using [something](https://github.com/eqcss/eqcss) [else](https://github.com/ausi/cq-prolyfill).


## Requirements   

`presto-points.js` requires [ResizeObserver](https://github.com/WICG/ResizeObserver), which is currently only implemented behind a flag in Chrome. Luckily, there’s an excellent [polyfill](https://github.com/que-etc/resize-observer-polyfill).


## Usage

Load `presto-points.js` in the `<head>`, after any ResizeObserver polyfill, synchronously.

```html
<head>
	<!-- (head stuff) -->
	<script src="ResizeObserverPolyfill.js"></script>
	<script src="presto-points.js"></script>
</head>
```

Then use it like this:

```css
.container {
	--presto-points: 10em .medium 20em .large;
}

.container.medium .element { /* applies when .container’s width is between 10em and 20em */
	/* do container query stuff */
}

.container.large .element { /* applies when .container’s width is >= 20em  */
	/* do some other container query stuff */
}
```
