import Head from 'next/head'
import SideBar from '../components/SideBar'
import Tech from './tech'
import Layout from '../components/Layout'
import { ReactElement } from 'react'
// import './style.scss'
export default function Home() {
  return (
    <div className="container">
    </div>
  )
}
Home.getLayout = function getLayout(page: ReactElement) {
  return (
    <Layout>
      {page}
    </Layout>
  )
}