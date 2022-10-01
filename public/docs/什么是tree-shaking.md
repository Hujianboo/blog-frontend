---
title: '什么是tree-shaking'
date: '20220925'
tag: 'tech'
---

# 什么是Tree-shaking

Created: September 25, 2022 10:13 PM

## Tree-Shaking概念

Tree-Shaking 最早是在rollup中被提出来的，其指的是消除不会被执行到的代码，即消除”dead code”。Javascript起初作为一门动态语言，本质上实现这个是很困难的，但是随着ESM的出现，终于能够消除一些无用的代码了。

在具体讲解tree shaking(其实也就是dead code elimination )前，必须先了解一下ESM的基本原理，因为它是在JS中实现tree shaking的前提。ESM的具体讲解可以看自己之前写的一篇文章总结，也可以看这篇比较详细的

[https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)  总而言之，ESM模块解析整体分为三个独立阶段，构建依赖图，内存中生成导出实例和最后执行代码。相比CJS，模块的整体关系图在执行之前就已经是确定了的。因此对于没有实际使用到但是属于依赖图中一部分的的导出，我们完全可以将它在最后的产物中删除。这也就是现代打包工具的Tree-Shaking。相比于静态语言的DCE，Tree-shaking做的并不是很好，因为它本质只是标记并删除未使用到的导出和部分能够被terser识别出来的无用的代码（很有限），但是对于模块内部的其他部分却无能为力,后面会举例讲解。

## webpack5中的Tree-Shaking

webpack5中对于Tree-Shaking的应用已经很成熟了，生产环境默认就是开启的。相关文档: [https://webpack.js.org/guides/tree-shaking/](https://webpack.js.org/guides/tree-shaking/)  这里为了举例，先将mode设置为none,并将`optimization.usedExports`设置为true（它能够标记出未使用到的export），为了能够更加地方便调试，这里顺便也将`optimization.moduleIds`打开设置为named，这样子能更好地在产物中分辨出各个文件module.

```jsx
// weboack配置
const path = require('path')
const webpack = require('webpack')
module.exports = {
  entry: "./index.js",
  mode: "none",

  output: {
    path: path.resolve(__dirname, "./dist"),
    filename: "[name].js",
    publicPath: "./dist/",
  },
  target: "node",
  optimization: {
    moduleIds: 'named',
    usedExports: true,
  },
  plugins: [
    new webpack.ids.DeterministicModuleIdsPlugin({
      maxLength: 5,
    }),
  ],
}
```

我们准备了两个文件，index.js是入口文件，math.js里有两个导出函数，一个是add一个是mines。我们在index.js中只import add方法但是不使用

```jsx
//index.js
import { add } from './math.js';

//math.js
const use = () => {
  console.log('use');
  return function(a,b){
    return a+b
  }
}
export const add =use();

console.log(33333);
export function mines(a, b) {
  return a - b;
}
//打包命令： webpack --entry ./index.js --config ./webpack.config.js
//打包产物 //dist/main.js
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 35451:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

/* unused harmony exports add, mines */
// import './big-module';
const use = () => {
  console.log('use');
  return function(a,b){
    return a+b
  }
}
const add =use();
console.log('math');
function mines(a, b) {
  return a - b;
}

//中间代码省略

/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/* harmony import */ var _math_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(35451);

})();

/******/ })()
;
```

我们清晰地可以看到，对于add和mines都被标记为了unused exports。如果我们直接将mode置为production，那么webpack就会使用terser来擦除bundle中的这些unused exports.

```jsx
// mode production的产物
(()=>{"use strict";console.log("use"),console.log("math")})();
```

我们发现最后产物add和mines都没有进入bundles，但是其中math.js的console.log(”math”) 出现在bundle中。Tree-shaking正如我之前开头所说，去掉dead code,其实只是去掉了exports导出和部分能够明确识别出的用不到的变量代码，（其实它的内在实现应该是include用到了的代码，没看源码 猜的，因为这样会简单很多）但是因为本身import这个行为就会最后执行一遍整个module文件，因此像console.log这个语句必定会被打进bundle中，正常的Tree-shaking过程不能擦除这些，因为它无法判断这些代码会不会有副作用，比如它本身的功能就是需要打印’math’呢,擦除了就影响到了最终结果。因此，webpack对于导入了但是却实际没有使用任何exports的并且被标注为no-sideEffect的模块，它都将整体擦除整个模块.官方描述：
> `If no direct export from a module flagged with no-sideEffects is used, the bundler can skip evaluating the module for side effects.`

至于sideEffect的用法，则是在包的package.json的添加。如果没有sideEffect字段，则默认整个包的所有文件都是有sideEffect的。如果为false，则默认整个包的所有文件都是没有sideEffect的，如果为一个数组如`[’a.js’,’b.js’]` 则认为a.js和b.js是有sideEffect的，其余的没有。

我们现在给package.json加上`sideEffects:false`这个字段，重新打包，最后的产物如下

```jsx

// mode 为 none
//dist.js
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

// add(1,1)
/******/ })()
;

// mode 为 production，产物为一个空文件
//dist.js

```

可以看到production下 整个产物直接变成了一个空文件，mode为none时，可以看出也直接忽略了没有使用到的module文件。

## **总结**

这里讲解了tree shaking的基本含义和原理，依靠ESM规范化达到删除没有用到的导出代码，本质还是DCE，但是却没有静态语言的DCE那样强大。同时本文也讲述了webpack5中开启tree shaking 的使用方法和要点。