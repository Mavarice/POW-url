var url = document.getElementById('url')
var loc = document.getElementById('location')

url.addEventListener('change', function (ev) {
  loc.value = ev.target.value
})
