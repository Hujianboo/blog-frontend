import Head from 'next/head'
import SideBar from '../components/SideBar'
import Layout from '../components/Layout'
import { ReactElement } from 'react'
import { getPostBySlug,markdownToHtml } from '../utils'
// import './style.scss'
export default function About({post}) {
  return (
    <div>
      <article
        dangerouslySetInnerHTML={{ __html: post.content }}
      >
      </article>
    </div>
  )
}
About.getLayout = function getLayout(page: ReactElement) {
  return (
      <Layout>
        {page}
      </Layout>

  )
}
export async function getStaticProps() {
  const res = getPostBySlug('record',[
    'content'
  ]) as any
  const content = await markdownToHtml(res.content|| '')
  return {
    props: {
      post: {
        content
      }
    },
  }
}