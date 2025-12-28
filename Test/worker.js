function renderHeader() {
  const header = document.getElementById("header");
  if (!header) return;

  const loggedIn = !!localStorage.getItem("sessionId");

  header.innerHTML = `
    <div class="nav-inner">
      <span class="logo">SeoClub</span>

      <div class="nav-right">
        <nav class="nav-links">
          <a href="/">Home</a>
          <a href="/store.html">Store</a>
          <a href="/cart.html">Cart</a>
          <a href="/product.html">Product</a>
          <a href="/faq.html">FAQ</a>
          <a href="/announcement.html">Announcements</a>

          ${
            loggedIn
              ? `
                <a href="/account.html">Account</a>
                ${
                  localStorage.getItem("isAdmin") === "true"
                    ? `<a href="/admin/index.html">Admin</a>`
                    : ``
                }
                <a href="#" id="logoutLink">Logout</a>
              `
              : `<a href="/login.html">Login / Register</a>`
          }
        </nav>

        <button class="hamburger" id="hamburger" aria-label="Menu">☰</button>
      </div>
    </div>

    <div class="menu-backdrop" id="menuBackdrop"></div>

    <div class="mobile-menu" id="mobileMenu">
      <button class="close-menu" id="closeMenu">×</button>

      <a href="/">Home</a>
      <a href="/store.html">Store</a>
      <a href="/cart.html">Cart</a>
      <a href="/product.html">Product</a>
      <a href="/faq.html">FAQ</a>
      <a href="/announcement.html">Announcements</a>

      ${
        loggedIn
          ? `
            <a href="/account.html">Account</a>
            ${
              localStorage.getItem("isAdmin") === "true"
                ? `<a href="/admin/index.html">Admin</a>`
                : ``
            }
            <a href="#" id="logoutLinkMobile">Logout</a>
          `
          : `<a href="/login.html">Login / Register</a>`
      }
    </div>
  `;

  // MENU TOGGLE
  const menu = document.getElementById("mobileMenu");
  const backdrop = document.getElementById("menuBackdrop");

  document.getElementById("hamburger").onclick = () => {
    menu.classList.add("open");
    backdrop.classList.add("show");
  };

  document.getElementById("closeMenu").onclick =
  backdrop.onclick = () => {
    menu.classList.remove("open");
    backdrop.classList.remove("show");
  };

  // LOGOUT
  const logout = document.getElementById("logoutLink");
  const logoutMobile = document.getElementById("logoutLinkMobile");

  [logout, logoutMobile].forEach(link => {
    if (link) {
      link.onclick = e => {
        e.preventDefault();
        localStorage.clear();
        window.location.href = "/login.html";
      };
    }
  });
}

renderHeader();