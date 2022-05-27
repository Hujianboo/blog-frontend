import Head from 'next/head'
import Layout from '../components/Layout'
import { ReactElement } from 'react'
import { getAllPosts } from '../utils'
import List from '../components/List'
export default function Tech({allPosts}) {
  return (
    <List allPosts={allPosts}></List>
  )
}
Tech.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      {page}
    </Layout>
  )
}


export async function getStaticProps() {
  const allPosts = getAllPosts([
    'title',
    'tag'
  ]).filter((item) => item.tag === 'tech')
  
  return {
    props: { allPosts },
  }
}
