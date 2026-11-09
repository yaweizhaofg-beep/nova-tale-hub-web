import type { Nav } from "@/router/page-location";
import styles from "./not-found-page.module.css";

export default function NotFoundPage({ navigate }: Nav) {
  return (
    <main className={styles.page}>
      <h1>页面不存在</h1>
      <button type="button" className={styles.action} onClick={() => navigate("landing")}>
        返回首页
      </button>
    </main>
  );
}
