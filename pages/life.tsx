import Head from 'next/head'
import SideBar from '../components/SideBar'
import Layout from '../components/Layout'
import { ReactElement } from 'react'
import { getAllPosts } from '../utils'
import List from '../components/List'
// import './style.scss'
export default function Life({allPosts}) {
  return (
    <List allPosts={allPosts}></List>
  )
}
Life.getLayout = function getLayout(page: ReactElement) {
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
  ]).filter((item) => item.tag === 'life')
  
  return {
    props: { allPosts },
  }
}
