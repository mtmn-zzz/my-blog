import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export function NavSearch() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");

  useEffect(() => {
    setValue(params.get("q") ?? "");
  }, [params]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  }

  return (
    <form className="nav-search" onSubmit={handleSubmit}>
      <input
        type="search"
        className="nav-search-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="搜索文章…"
        aria-label="搜索文章"
        maxLength={100}
      />
      <button type="submit" className="nav-search-btn" aria-label="搜索">
        搜索
      </button>
    </form>
  );
}
