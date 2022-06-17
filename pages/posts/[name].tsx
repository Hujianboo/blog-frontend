import { getPostBySlug,getAllPosts,markdownToHtml } from "../../utils"
import Layout from "../../components/Layout"


export default function Post({post}) {
  return (
    <div className="post-container">
      <strong className="time-stamp">{`CREATED DAY:${post.date || ''}`}</strong>
      <article
        dangerouslySetInnerHTML={{ __html: post.content }}
      >
      </article>
    </div>
  )
}
export async function getStaticProps({params}) {
  const res = getPostBySlug(params.name,[
    'content','date'
  ]) as any
  const content = await markdownToHtml(res.content|| '')
  return {
    props: {
      post: {
        content,
        date: res.date
      }
    },
  }
}
export async function getStaticPaths() {
  const posts = getAllPosts(['slug'])

  return {
    paths: posts.map((post) => {
      return {
        params: {
          name: (post as any).slug,
        },
      }
    }),
    fallback: false,
  }
}
Post.getLayout = function getLayout(page: any) {
  return (
      <Layout>
        {page}
      </Layout>

  )
}