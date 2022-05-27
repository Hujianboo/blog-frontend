import fs from 'fs'
import Path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'
import prism from 'remark-prism';
const docsDirectory = Path.join(process.cwd(),'public/docs');

export function getPostBySlug(slug, fields = []):any {
  const realSlug = slug.replace(/\.md$/, '')
  const fullPath = Path.join(docsDirectory, `${realSlug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const items = {}

  // Ensure only the minimal needed data is exposed
  fields.forEach((field) => {
    if (field === 'slug') {
      items[field] = realSlug
    }
    if (field === 'content') {
      items[field] = content
    }

    if (typeof data[field] !== 'undefined') {
      items[field] = data[field]
    }
  })

  return items
}
export function getPostSlugs() {
  return fs.readdirSync(docsDirectory)
}

export function getAllPosts(fields = []):Array<{title:string,tag:string}> {
  const slugs = getPostSlugs()
  const posts = slugs
    .map((slug) => getPostBySlug(slug, fields))
  return posts
}
export async function markdownToHtml(markdown) {
  const result = await remark()
  // .use(remarkParse)
  .use(html,{sanitize: false})
  .use(prism).process(markdown)
  return result.toString()
}
