import Head from 'next/head'
import SideBar from '../components/SideBar'
import Layout from '../components/Layout'
import { ReactElement } from 'react'
import List from '../components/List'
import { getAllPosts } from '../utils'
// import './style.scss'
export default function Game({allPosts}) {
  return (
    <List allPosts={allPosts}></List>
  )
}
Game.getLayout = function getLayout(page: ReactElement) {
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
  ]).filter((item) => item.tag === 'game')
  
  return {
    props: { allPosts },
  }
}
