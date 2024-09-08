---
title: "pure function"
date: "20200316"
tag: "tech"
---

# pure function

看完了 ramda 的基本用法以及大致草草地看了一下相关的 haskell 语法。

haskell 的类型系统实在是难以理解，因为主要目的是能够简化数据处理的手段，并不是具体地去研究编程范式，所以并没有继续深入下去。相反，ramda.js 这个库研究了不少，得到了不少启发。

看完了[这个系列文章](https://www.educative.io/courses/functional-programming-patterns-with-ramdajs) 。这个作者讲的非常的好。它基本上了介绍了 ramda.js 这个库的常见用法， 并且顺带地讲到了函数式的一些重要概念。个人认为，其实 js 本身就是多范式的语言，在平常的工作中，往往都会不自觉地采取面向对象和函数式，不会过多地在意。所以其中的 pipe 以及 compose,并没有觉得太多的新奇。functor 算是一个比较有趣的概念。

functor 可以理解为一个必须要含有一个叫 map 方法的容器，map 方法可以对集合里的数据进行变换得到另一个新集合（个人理解）。

常见的用法比如

```js
const functorFn = (x) => ({
  value: x,
  map: (fn) => functorFn(fn(x)),
});

functorFn(2233).map((x) => x + 1);
//得到应该是一个 value为2234的functor新对象
```

这是一个创建 functor 的函数，它接受一个值，并且返回一个包含传入值 value 和一个 map 方法的对象，新对象可以利用 map 方法接受变换函数 fn,对内部的值进行改造，从而得到一个新的 functor。因为创建新的一个对象，所以不会对原有的对象的 value 进行影响，并且其可以不断地链式调用。

functor 这种模型能够很好地将不可变性和组合特性结合在一起。ramda.js 很多方法对 functor 做了兼容，比如 map 方法，除了普通对象和函数，专门针对带有‘['fantasy-land/map', 'map']’字段的 functor 对象做处理（\_dispatchable 是一个处理不同方法策略的高阶函数）

```js
var map = _curry2(
  _dispatchable(["fantasy-land/map", "map"], _xmap, function map(fn, functor) {
    switch (Object.prototype.toString.call(functor)) {
      case "[object Function]":
        return curryN(functor.length, function () {
          return fn.call(this, functor.apply(this, arguments));
        });
      case "[object Object]":
        return _reduce(
          function (acc, key) {
            acc[key] = fn(functor[key]);
            return acc;
          },
          {},
          keys(functor)
        );
      default:
        return _map(fn, functor);
    }
  })
);
export default map;
```

大致了解花了两天的时间，利用函数式风格做一些基本的逻辑操作是没什么问题了。但是个人并不打算将 ramda 这个库应用在项目上，原因有好多点

1. 大多数项目都是合作项目，同事可能会排斥，不一定能够很好接手
2. 主要针对数据的增删改查，对 ramda 库不是很放心
3. ramda 库部分 api 比较独有（已知 lenses 这种功能 lodash/fp 目前并没有），不具备共享性。

但是，相关的其中了解到的思想还是非常值得借鉴学习的。比如更好的利用管道方式、functor 的使用以及高阶函数的使用。在工作中可以尝试简单地进行封装函数式工具类，或者使用 lodash/fp 能够更加地让同事们接手合作。

另外还有一本[书](https://mostly-adequate.gitbook.io/mostly-adequate-guide/)，这是上述课程最后介绍的，粗粗扫了一眼，可能正是自己需要的，既不会太多使用第三方库却又能够很好地利用函数式的思想对代码进行合理简化。后续看完有了值得借鉴的地方后，再更新这篇文章吧。
