import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section>
      <h1>Page Not Found</h1>
      <p>The page you requested does not exist.</p>
      <Link to="/">Go to Control Tower</Link>
    </section>
  );
}
