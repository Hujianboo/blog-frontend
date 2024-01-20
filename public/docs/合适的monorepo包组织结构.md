---
title: "合适的monorepo包组织结构"
date: "20240120"
tag: "tech"
---

# 合适的 monorepo 包组织结构

首先确立一个前提

1.  真正浏览器或者 nodejs 使用的产物代码是 javascript，而不是 typescript。
2.  每个包的 package.json main 用来指定 umd（cjs)模块的入口，module 用来指定 es 模块的入口。
3.  截至 2024.1.18，正常打包通常会打包出上这两种格式的。在 tsc 编译后或者 rollup 和 esbuild 等 bundle 工具加工后的产物，对应入口就应该指向对应的 dist 或者 output 路径。

在 monorepo 下，我们应该也要保证，所有的包打包产物是符合上面的规范。

## 现状：

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/254127d3-b33d-438f-9ba5-38ea6a5b7410.png)

### 问题

1.  monorepo 下的包 package.json，入口的 main 和 module 通常还是 dist 目录，不方便调试。
2.  引用的别的包还是通过相对路径的形式，而不是从 node_modules 的路径去引入，编译类型目录不对。
3.  每个包都有自己的输出目录，包 build 的时候依赖别的包的输出。如何解决？

### 解决

**问题一：**monorepo 下的包 package.json，入口的 main 和 module 通常还是 dist 目录，不方便调试

1.  使用 yarn 或者 npm，在 publish 的时候修改 package.json 字段值。
2.  使用 pnpm 的话，直接使用 publishConfig 解决发布时候的问题，覆盖原来的一些字段。

代码仓库

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/6ef584e9-16f8-4182-a852-004a984a730d.jpeg)

实际下载的 npm 包

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/2df397ef-9cc8-44ec-9384-57b616d5fa0d.jpeg)

优点:

- 不用启动都每次把每一个包都 build 一次
- 调试的时候，可以直接 debug 进入到对应依赖的包的源代码。

**问题二：**使用相对路径去引用同层级的包，导致打包结果层级多余

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/5f509429-a651-41a4-af9f-7cf2ffedcba3.png)

多余的层级结果

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/c0204a6b-6354-466f-8ee6-3577753ed233.png)

更正过后，正确的层级结果

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/c4670f6b-7e6f-495b-9074-d857aed11006.png)

原因：因为相对路径引用到了当前 package 的外部，ts 编译的时候，导致当前最小目录（rootDir)变为了最外层,导致生成的类型路径不对。

解决方法：使用 node_modules 下的包，而不是通过相对路径的方式去引用同层级的包。

**问题三：**每个包都有自己的输出目录，包 build 的时候依赖别的包的输出。如何解决？

A: 1. Nx 做 build 管理。2. 自己写一个小脚本解决 build 顺序。3. 打包 build 的时候把依赖的内部的包都 external 掉，但是 dependencies 或 peerDependencies 里仍然标出该包。

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/a235b825-7d5e-4f9e-9073-b5b61f2aac9f)

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/1a6f6d58-65bd-4d2e-9946-e41bb98c891f.png)

## 目标（改进后）

![image](https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/8K4nyRkJjvxpqLbj/img/805d91f1-c286-4549-b0e0-03c64c26fb53.png)

### 周边推荐阅读

1.  [https://github.com/stereobooster/package.json](https://github.com/stereobooster/package.json#types)

2.  [https://pnpm.io/package_json#publishconfig](https://pnpm.io/package_json#publishconfig)
3.  [https://www.typescriptlang.org/tsconfig#rootDir](https://www.typescriptlang.org/tsconfig#rootDir)
4.  现代 JavaScript 库开发：原理、技术与实战 [https://book.douban.com/subject/36162488/](https://book.douban.com/subject/36162488/)
5.  node_modules 的困境 [https://zhuanlan.zhihu.com/p/137535779](https://zhuanlan.zhihu.com/p/137535779)
