import Head from "next/head";
import SideBar from "../components/SideBar";
import Layout from "../components/Layout";
import { ReactElement } from "react";
import { getAllPosts } from "../utils";
import List from "../components/List";
import { appendFile } from "fs";
// import './style.scss'
export default function Life({ allPosts }) {
  return <List allPosts={allPosts} disabled></List>;
}
Life.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export async function getStaticProps() {
  const allPosts = getAllPosts(["title", "tag", "date"]).filter(
    (item) => item.tag === "life"
  );
  return {
    props: { allPosts },
  };
}
