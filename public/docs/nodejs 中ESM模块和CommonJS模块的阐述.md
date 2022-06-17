---
title: 'nodejs 中ESM模块和CommonJS模块的阐述'
date: '20220618'
tag: 'tech'
---
# nodejs 中ESM模块和CommonJS模块的阐述

最近在一直看《Nodejs 设计模式（第三版）》，其中自己最值得看的就是模块的这一部分了，因为是自己一直以来搞不清楚的部分。很好地是，这本书很好地讲清楚了它们之间的区别。

## CommonJS

一开始的ecmascript其实是没有相关的模块化标准的，也没有namespace这种概念。所有的东西都是变量都是统一地暴露在全局上，因此非常容易出现问题。直到后来社区出现了各种自建模块行为，主要就是利用闭包性质和立即执行函数 比如

```jsx
const myModule = (() => {
	const privateFoo = () => {}
	const privateBar = []
	const exported = {
		publicFoo: () => {},
		publicBar: () => {}
	 }
	return exported
})() // once the parenthesis here are parsed, the function
// will be invoked
console.log(myModule)
console.log(myModule.privateFoo, myModule.privateBar)
```

这种立即执行函数会返回一个对象，这个对象包含了内部的变量。因此这里的myModule就可以理解为一个namespace。这样子就可以利用myModule这个变量，访问它内部。

后来Nodejs自己提出了一个模块化方式，就是CommonJS,其实CommonJS完全可以利用javascript已有的功能自行实现。它主要有两个特点:

- require 用于导入模块
- exports 和 moudle.exports 用于模块中内容的导出

## 导入和导出

首先是模块导入，书中给出了如下require的实现方式：

```jsx
function require (moduleName) {
console.log(`Require invoked for module: ${moduleName}`)
const id = require.resolve(moduleName) 
if (require.cache[id]) { 
return require.cache[id].exports
 }
// module metadata
const module = { 
exports: {},
 id
 }
// Update the cache
require.cache[id] = module
// load the module
 loadModule(id, module, require) 
// return exported variables
return module.exports 
}
require.cache = {}
//resolve函数用于获取module的路径，这里为简单方便可以使用原生的require.resolve();
require.resolve = (moduleName) => {
/* resolve a full module id from the moduleName */
}
```

整体的逻辑比较清晰：require之前先判断这个模块有无之前加载过，有加载过的直接从缓存中返回，如果没有，就进行loadModule操作。这里有个奇怪的地方：这个loadModule函数都没有返回值，怎么它的下一步，就是return了？ CommonJS实现的trick地方莫过于此了，下面就是loadModule函数的实现：

```jsx
function loadModule (filename, module, require) {
	const wrappedSrc =
	`(function (module, exports, require) {
	${fs.readFileSync(filename, 'utf8')}
	 })(module, module.exports, require)`
	eval(wrappedSrc)
}
```

其内部的实现很清晰明了，读取模块文件拼到一个字符串函数里，然后执行。其主要点在于对形参module进行了改造，因此能够在其外部函数得到相应module.exports结果。其实这个设计方式在现在很多编程理念中会被认为很不好:-D 因为side effect的影响太明显，但是怎么说毕竟实现了功能而且范围也只是在内部模块里，纠结有没有遵循编程范式没什么必要，个人觉得没什么问题。

与此同时，这里也可以看出经常容易让人搞混的CJS模块导出字段，export 和 module.exports的区别到底是什么。commonjs里的exports本质上就是module内部exports的引用。当你在CJS类型的模块里同时使用module.exports和exports时，只要看下上面的代码逻辑，就能分析出不同情况下导出内容被覆盖的原因了。最好的方式还是尽量单独用exports或module.exports单一种来导出，免得弄混。

同时还有当require(moduleName)某个模块时，它是应该是按照下面机制去搜寻的，

- File Modules: 当moduleName是 /（绝对路径）或者 ./（相对路径） 开头
- nodejs Core Modules: 没有 / 或者 ./ 开头
- Package Modules : 当在nodejs自带核心模块中没有找到，就会在当前目录里的node_modules里找，如果没有，则会依次往上级目录的node_modules里找，直达电脑系统的文件目录最顶层的全局node_moudles。

与此同时，文件匹配则是根据下面方式来的

- <moduleName>.js
- <moduleName>/index.js
- <moduleName>/package.json中字段名main对应的文件/文件名

### 模块互相依赖

cjs模块处理循环依赖有很大的问题，如果存在互相依赖，并且每次打乱导入的上下游顺序，就会得到完全不同的导出结果。举个书中的例子。

```jsx
//a.js
exports.loaded = false

const b = require('./b')

module.exports = {
  b,
  loaded: true // overrides the previous export
}
//b.js
exports.loaded = false

const a = require('./a')

module.exports = {
  a,
  loaded: true // overrides the previous export
}
//main.js
const a = require('./a')
const b = require('./b')

console.log('a ->', JSON.stringify(a, null, 2))
console.log('b ->', JSON.stringify(b, null, 2))
```

对main进行执行后，记住结果，之后调换导入a和b的顺序你会发现结果就会发生变化。其实按照只要按照上面的require的实现，拿纸和笔画一下流程，就能很好的分析出结果为什么有这样的变化，因为CJS方案本质是一个同步顺序执行的过程，在中途存在非常多不可控的因素。

## ESM

在使用上，ESM使用export和import作为导出和导入的关键字段，在应用层面，大致用法和其他语言的导入导出都相同，也和CJS的区别不大。但是在导出方面比CJS要灵活很多，它在混合使用default和具体名导出时，不会有太大的冲突。

```jsx
// logger.js
export default function log (message) {
	console.log(message)
}
export function info (message) {
 log(`info: ${message}`)
}

//main.js
import mylog,{info} from './logger.js'
//mylog即为对应的default info为具名导出
```

与此同时，ESM import对应的ModuleName也有以下几种可能，总体和CJS用法相同

- File Modules: 当moduleName或者 ./（相对路径） 开头 或者 [file://xxx](file://xxx) （绝对路径）开头
- nodejs Core Modules 或者 Package Modules: 没有 / 或者 ./ 开头
- package Modules内的某个文件：类似 fastify/lib/logger.js
- http url: 类似 [https://unpkg.com/lodash](https://unpkg.com/lodash)  （此种方式仅适用于浏览器）

另外正常情况下，ESM的import不能够在运行时使用的，可以简单地理解为静态，和C++里使用类似，这也是ESM的构建过程决定的，后面会讲。但是有时候必须用到运行时导入，所以ESM也给出了一个简单地解决方法：import()该方式能够动态地导入某个模块，但是它使用的是异步操作，因此返回结果是一个promise

```jsx
import('xxxx').then((res) => {
	//具体操作
})
```

### 加载过程

加载过程这里详细讲一下，因为ESM的实现比CJS复杂很多，而且相对来说不好实现。这里主要就只能讲具体过程，具体实现等有空了看下官方是如何实现的，然后再研究下能不能用纯js实现。

它分为三个阶段: 

1. 构建阶段(Construction) 找到所有的import相关文件构建依赖关系,
2. 实例化阶段(Instantiation) 对于依赖关系文件内容里的export 变量，都在内存中创建一个名字相同的引用指向原变量。此时因为代码未执行，因此都是undefined
3. 执行阶段(Evaluation)  代码执行，之前内存里的对应的引用都会得到相应的具体值。

其实粗看跟CJS的加载过程类似，但是CJS是顺序同步执行的，在构建构成中，就已经在执行代码了，因此可以理解为几个不同阶段在按代码顺序同时进行，直到全部完毕。但是ESM这三个阶段是互相独立完全分开的，只有1阶段完毕才能2阶段最后3阶段（CJS类似多个任务在一个线程里互相抢占，直到全部完成，而ESM也是多个任务一个线程，但是只有前一个任务彻底完成，才能接着下一个）

### 模块互相依赖

因为加载过程的改进，相比于CJS,ESM的循环依赖地部分问题得到了很好地解决

```jsx
// a.js
import * as bModule from './b.js'
export let loaded = false   //4
export const b = bModule    //5
loaded = true     //6

// b.js
import * as aModule from './a.js'
export let loaded = false   //1
export const a = aModule   // 2
loaded = true    //3

//main.js
import * as a from './a.js'
import * as b from './b.js' //已加载过，直接从缓存中返回结果

console.log('a ->', a)  //7
console.log('b ->', b)   //8
```

这里在main.js中，无论如何调换a和b的导入顺序，最后执行的main.js的输出结果都是一样的。首先会构建出a.js、b.js 以及 main.js之间的导入导出关系，之后在内存中创建各自导出变量的引用并且不赋值，最后顺序执行代码。因为从main.js这里一开始是引入a.js，a.js又引入b.js ，因此，b.js先执行，之后执行完后执行a.js，最后执行main.js。整体的执行顺序是按照一开始建立的依赖图关系，从底到上依次执行。

但是ESM只是解决了导入顺序引起的bug，并没有解决互相依赖引起的问题，可以在简单地调试试试，比如我们在b.js中加入一个打印

```jsx
//b.js
import * as aModule from './a.js'
export let loaded = false
export const a = aModule
console.log('a-->' a)
loaded = true
```

```jsx
//执行结果 node main.js
a --> [Module: null prototype] {
  b: <uninitialized>,
  loaded: <uninitialized>
}
a -> <ref *1> [Module: null prototype] {
  b: [Module: null prototype] { a: [Circular *1], loaded: true },
  loaded: true
}
b -> <ref *1> [Module: null prototype] {
  a: [Module: null prototype] { b: [Circular *1], loaded: true },
  loaded: true
}
```

会发现此时打印出来的第一个a的内部变量都为undefined.然而最后的main.js之后的打印出来的都是正常的内容。这里会出现这种情况是因为a和b本身因为互相依赖比较特殊，在b执行时发现a还没有给导出的那些变量赋值。在工作中当然应该杜绝这种a和b互相引用并用于逻辑的情况。

## CommonJS和ESM之间的互相使用

先给出结论：**ESM中使用之前的CommonJS模块很容易。现在的nodejs的版本基本上都支持，直接导入即可。但是在CommonJS中使用ESM是不可能的。** 毕竟之后是要慢慢淘汰之前的CJS规范，逐步往ESM规范靠近。

在ESM中使用CommonJS主要有两种方式：

1.使用module里的createRequire方法创建一个require,后续即可正常使用

```jsx
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('./data.json')
```

2.直接导入

```jsx
import {a} from './a.cjs'
```

另外，ESM使用是默认 strict 模式,而且ESM中其实是不包含cjs的一些特定方法和变量的，所以在使用ESM中某些常用的CJS的方法我们会无法使用。常见的比如exports module require __filename __dirname等，当然我们可以用特殊手段实现它们，比如上面导入CJS模块的方法一中require,具体可以看下面的nodejs官网链接解释。

> [https://nodejs.org/docs/latest-v15.x/api/esm.html
> #esm_no_require_exports_or_module_exports](https://nodejs.org/docs/latest-v15.x/api/esm.html#esm_no_require_exports_or_module_exports)
> 

## 总结

随着社区的发展，后来的ESM比CJS是要先进许多。因为现在相当多的历史模块仍然是CJS,所以目前处于一个两者共存的一个尴尬状态，工作中难免同时都会用到，因此很好地理解两者之间的关系很有必要。对个人来说，对于CJS和ESM比较难懂的点就在于上面这些了，如果哪里还有补充之后再看看吧。