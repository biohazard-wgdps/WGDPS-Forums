const postsDiv = document.getElementById('posts');

fetch('/posts')
  .then(r => r.json())
  .then(posts => {
    postsDiv.innerHTML = '';
    posts.forEach(p => {
      postsDiv.innerHTML += `
        <div class="card">
          <img src="${p.avatar || '/uploads/avatars/default.png'}" width="40">
          <h3>${p.title}</h3>
          <div>${p.body}</div>
          <small>by ${p.username}</small>
        </div>
      `;
    });
  });
