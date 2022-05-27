import './style.scss'
import '../components/SideBar/style.scss'
import '../components/TopBar/style.scss'
export default function MyApp({ Component, pageProps }) {
  const getLayout = Component.getLayout || ((page) => page)
  return getLayout(<Component {...pageProps} />)
}