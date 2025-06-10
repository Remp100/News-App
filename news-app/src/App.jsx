import React, { useEffect, useState, useCallback, useRef } from "react";

const API_KEY = "6e68d91ddc69414189aa00b953e78fb5";
const PAGE_SIZE = 9;
const categories = [
  "general",
  "business",
  "entertainment",
  "health",
  "science",
  "sports",
  "technology",
];

export default function NewsSite() {
  // STATES: articles, loading/error, search & debounced search, pagination, category, bookmarks, view mode, modal, dark mode
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [category, setCategory] = useState("general");
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bookmarks")) || [];
    } catch {
      return [];
    }
  });
  const [showFavorites, setShowFavorites] = useState(false);
  const [modalArticle, setModalArticle] = useState(null);
  const [darkMode, setDarkMode] = useState(
    () => JSON.parse(localStorage.getItem("darkMode")) || false
  );
  const loaderRef = useRef(null);

  /**
   * Debounce logic: update debouncedSearch 500ms after typing stops
   */
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search.trim()), 500);
    return () => clearTimeout(handler);
  }, [search]);

  /**
   * Reset articles and fetch first page when category or favorites view changes
   */
  useEffect(() => {
    if (!showFavorites) {
      setPage(1);
      setArticles([]);
      fetchArticles(1);
    }
  }, [category, showFavorites]);

  /**
   * Persist dark mode and apply CSS class
   */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  /**
   * Fetch articles from API for a given page
   */
  const fetchArticles = async (pageToLoad = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://newsapi.org/v2/top-headlines?country=us&category=${category}&pageSize=${PAGE_SIZE}&page=${pageToLoad}&apiKey=${API_KEY}`
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const { articles: newArticles, totalResults } = await res.json();
      setArticles((prev) =>
        pageToLoad === 1 ? newArticles : [...prev, ...newArticles]
      );
      setTotalResults(totalResults);
      setPage(pageToLoad);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Infinite scroll: observe loaderRef and fetch next page when visible
   */
  useEffect(() => {
    if (showFavorites || !loaderRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          articles.length < totalResults &&
          !loading
        ) {
          fetchArticles(page + 1);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [articles, totalResults, loading, page, showFavorites]);

  // Filter list for display: articles or bookmarks, then by search term
  const sourceList = showFavorites ? bookmarks : articles;
  const filtered = sourceList.filter((a) =>
    a.title.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  /**
   * Bookmark helpers: check and toggle
   */
  const isBookmarked = useCallback(
    (url) => bookmarks.some((b) => b.url === url),
    [bookmarks]
  );
  const toggleBookmark = (article) => {
    const updated = isBookmarked(article.url)
      ? bookmarks.filter((b) => b.url !== article.url)
      : [article, ...bookmarks];
    setBookmarks(updated);
    localStorage.setItem("bookmarks", JSON.stringify(updated));
  };

  /**
   * Share article via Web Share API or fallback to clipboard
   */
  const shareArticle = (url) => {
    if (navigator.share) {
      navigator.share({ url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      {/* HEADER: title, favorites toggle, dark mode toggle */}
      <header className="relative mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-center">
          Your Daily Headlines
        </h1>
        <button
          onClick={() => setShowFavorites((f) => !f)}
          className="absolute top-0 left-0 px-4 py-2 rounded-full bg-blue-600 text-white shadow hover:opacity-90 transition"
        >
          {showFavorites ? "Back to News" : `Favorites (${bookmarks.length})`}
        </button>
        <button
          onClick={() => setDarkMode((d) => !d)}
          className="absolute top-0 right-0 px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow hover:opacity-90 transition"
        >
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </header>

      {/* SEARCH & CATEGORIES (hidden in favorites) */}
      {!showFavorites && (
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <input
              type="text"
              placeholder="Search articles..."
              className="w-full max-w-xl px-6 py-3 rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <nav className="flex justify-center flex-wrap gap-6">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-5 py-2 rounded-full font-medium transition whitespace-nowrap ${
                  category === cat
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow"
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ARTICLES GRID with loading placeholders and filtered results */}
      <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {!loading && filtered.length === 0 && (
          <p className="col-span-full text-center text-gray-500">
            {showFavorites ? "No favorites saved." : "No articles found."}
          </p>
        )}

        {loading && !showFavorites && page === 1
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-2xl h-64"
              />
            ))
          : filtered.map((a, i) => (
              <article
                key={i}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden flex flex-col hover:shadow-2xl transition"
              >
                {a.urlToImage && (
                  <img
                    src={a.urlToImage}
                    alt={a.title}
                    className="h-48 w-full object-cover"
                  />
                )}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                    <span>{new Date(a.publishedAt).toLocaleDateString()}</span>
                    <span>{a.source.name}</span>
                  </div>
                  <h2 className="text-lg font-semibold mb-3 flex-1">
                    {a.title}
                  </h2>
                  <p className="text-sm mb-4 text-gray-700 dark:text-gray-300">
                    {a.description?.substring(0, 120)}…
                  </p>
                  <div className="mt-auto flex space-x-4">
                    <button
                      onClick={() => setModalArticle(a)}
                      className="text-blue-600 hover:underline"
                    >
                      Details
                    </button>
                    <button
                      onClick={() => shareArticle(a.url)}
                      className="hover:text-blue-500"
                    >
                      Share
                    </button>
                    <button
                      onClick={() => toggleBookmark(a)}
                      className="hover:text-yellow-400"
                    >
                      {isBookmarked(a.url) ? "★" : "☆"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
      </div>

      {/* ERROR MESSAGE and LOADER spacer */}
      {error && <p className="text-center text-red-500 mt-6">Error: {error}</p>}
      <div ref={loaderRef} className="h-10" />

      {/* MODAL for full article details */}
      {modalArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full overflow-auto max-h-full p-8 relative">
            <button
              onClick={() => setModalArticle(null)}
              className="absolute top-2 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              ✕
            </button>
            {modalArticle.urlToImage && (
              <img
                src={modalArticle.urlToImage}
                alt=""
                className="rounded-lg mb-6 w-full h-64 object-cover"
              />
            )}
            <h2 className="text-2xl font-bold mb-4">{modalArticle.title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {new Date(modalArticle.publishedAt).toLocaleString()} |{" "}
              {modalArticle.source.name}
            </p>
            {(() => {
              const raw =
                modalArticle.content ?? modalArticle.description ?? "";
              const clean = raw.replace(/\[\+.*?\]$/, "").trim();
              return (
                <p className="mb-6 text-gray-800 dark:text-gray-200">{clean}</p>
              );
            })()}
            <a
              href={modalArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
            >
              Read Full Article
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
