# tooltipster-follower
Follower is a Tooltipster plugin to make tooltips follow the cursor.

Installation
------------

Include the javascript plugin file in your page AFTER Tooltipster's file. Also include Follower's CSS base file.

```html
<html>
    <head>
        ...
        <link rel="stylesheet" type="text/css" href="tooltipster/dist/css/tooltipster.bundle.min.css" />
        <link rel="stylesheet" type="text/css" href="tooltipster-follower/css/tooltipster-follower.min.css" />
        ...
        <script type="text/javascript" src="tooltipster/dist/js/tooltipster.bundle.min.js"></script>
        <script type="text/javascript" src="tooltipster-follower/js/tooltipster-follower.min.js"></script>
    </head>
</html>
```

> Follower includes the same-looking themes as sideTip, you'll have to include their files as well if you want to use them (located in `tooltipster-follower/css/themes`).

> If you have no tooltips using `sideTip` in your page, you may use Tooltipster's core files instead of the bundle ones.

Usage
-----

Declare the `laa.follower` plugin in the options of the tooltips you want to follow the cursor, instead of `tooltipster.sideTip`:

```javascript
$('.tooltip').tooltipster({
    plugins: ['laa.follower']
});
```

