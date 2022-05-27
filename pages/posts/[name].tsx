import { getPostBySlug,getAllPosts,markdownToHtml } from "../../utils"
import Layout from "../../components/Layout"


export default function Post({post}) {
  return (
    <div className="post-container">
      <article
        dangerouslySetInnerHTML={{ __html: post.content }}
      >
      </article>
    </div>
  )
}
export async function getStaticProps({params}) {
  const res = getPostBySlug(params.name,[
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