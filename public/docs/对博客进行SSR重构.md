---
title: '对博客进行SSR重构'
date: '20220531'
tag: 'tech'
---
# 对博客进行SSR重构

最近自己对自己的博客进行了改造，整体的调整的点在于

- 博客主体框架迁移到了Next.js。
- 博客部署迁移到了vercel,并且更换上了新域名。

首先说一下为什么要对博客进行SSR的改造。众所周知，服务端渲染的好处在于: 用户能够在刚刚打开网站时就能够快速地见到网页地全部内容，因为相比于CSR这种模式，它减少了在客户端渲染出dom这个环节。也就是说，我们需要在用户请求页面的时候，就需要在后端渲染好整体的dom结构。这个在以前的B/S架构中，本是应该的事情，但是随着前后端分离时代的到来，为了提高开发效率才将ui界面全部放到了前端，但是这种造成的问题一是首屏渲染速度太慢，二是SEO效果太差，因此，现在出现了一个叫做同构渲染的东西。简单来说，支持同构渲染的框架能够将原本用于CSR的vue,react这些项目在node环境下都通通先执行一遍生成对应的html快照，然后当用户首次进入时，直接返回对应路径的html页面（用来减小首屏速度），之后的操作，则又会按照CSR正常的思路来（因为仍然还会做CSR的js产物）。总的来说，它结合了CSR和SSR的共同优点吧。

因为做完整的同构渲染，其实还是比较麻烦的，好在现成的ssr框架比较多，vue的Nuxt，react的Next，因为我的博客一开始是用react写的，因此这里也采用了Next来重新进行重构。

### **路由重构**

Nextjs以项目中pages文件夹内的目录结构生成对应的路由，这种方式减小了在编写大型项目时路由结构的心智负担。

- `/pages/index.tsx`  → `/`
- `/pages/about.tsx` → `/about`

同时作为博客的需要，每篇博文必定使用同一套页面结构，区别在于路由的最后参数不同。当然Next也提供了动态路由也能很好地支持这个需求

`/pages/posts/[name].tsx` → `/posts/[name]`

与此同时，next专门也提供了404的定制页，当用户走到一个什么也没有的页面时，会特定的返回pages内部中的`404.tsx`中的内容。

### 样式处理

Next对全局样式做了特别处理，为了避免冲突，它规定所有的全局样式必须在最外层的 _app.js 中导入。

> Due to the global nature of stylesheets, and to avoid conflicts, you may **only import them inside `[pages/_app.js](https://nextjs.org/docs/advanced-features/custom-app)`** [https://nextjs.org/docs/basic-features/built-in-css-support](https://nextjs.org/docs/basic-features/built-in-css-support)
> 

因此，博客重构时，就将每个组件内部的`sytle.scss` 都依次地导入了`_app.js`中

### 布局处理

next在使用过程中，有一个痛点就在于不能做到内嵌路由。什么意思呢，就是类似于在使用react-router中，我们常见会使用其中的 Switch 和 Route 来作为内嵌路由，然后外部的UI和数据状态仍然是这些不同路由对应共用的。但是，在next的路由却不存在这种状态，因此需要一点hack的方式去实现。

```jsx
// pages/_app.js
export default function MyApp({ Component, pageProps }) {
  return <Layout>
					<Component {...pageProps} />
				 </Layout>
}

```

```jsx
//compoents/layout
import SideBar from "../SideBar"
import Head from 'next/head';
import TopBar from "../TopBar";

export default function({children}) {
  return (
    <>
    <Head>
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no"/>
    </Head>
    <div className="app-container">
      <TopBar/>
      <SideBar/>
      <div>
        {children}
      </div>
    </div>
    </>
    
  )
}
```

这里可以通过一个嵌套组件的方式实现，在项目总入口`_app.js` 总入口处引入一个Layout组件，Layout组件会对接收的外部组件包裹一层。这样子当不论内部的`Component`如何改变（对应到Layout里面就是`Children` ），外部的UI和数据状态都能够保持不变。

这种方式的整体实现上布局都是固定的，如果每个page都有单独的Layout或者需要特定修饰，可以在对应的组件上直接挂上一个函数，该函数用来做定制需求，这个地方其实是利用了react对虚拟dom做更新比较的特点，它能够保证最小区域变化（具体需要单独开一个坑来讲这个块）如下所示

```jsx
// pages/index.js
Index.getLayout = function getLayout(page: ReactElement) {
  return (
      <Layout>
        {page}
      </Layout>

  )
}
// pages/_app.js
export default function MyApp({ Component, pageProps }) {
//判断有无单独的定制函数
  const getLayout = Component.getLayout || ((page) => page)
  return getLayout(<Component {...pageProps} />)
}
```

> [https://adamwathan.me/2019/10/17
> /persistent-layout-patterns-in-nextjs/](https://adamwathan.me/2019/10/17/persistent-layout-patterns-in-nextjs/) 该链接很好地阐明了这种问题以及解决方法，并对该系列称为Persistent Layout。
> 

### 文章解析

对于markdown内容解析成html，本人则直接使用了开源的remark相关的一系列工具链。

```jsx
export async function markdownToHtml(markdown) {
  const result = await remark()
  // .use(remarkParse)
  .use(html,{sanitize: false})
  .use(prism).process(markdown)
  return result.toString()
}
```

文章所有都放在项目的public/docs路径下，并且每篇文章的头部，都有相关的前缀用来标识该文章的分类，时间和标题等。这里使用`gray-matter`来解析文本前缀（前缀按照对应格式要求填写即可）