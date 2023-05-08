//import * from "./api.js";

const registerBtn = document.querySelector('#register-btn');
const loginBtn    = document.querySelector('#login-btn');

const memberScreen = document.querySelector('#member-screen');
const guestScreen  = document.querySelector('#guest-screen');

const loginError    = document.querySelector('#login-err-btn');
const registerError = document.querySelector('#register-err-btn');

const userFavs = document.querySelector('#user-favs');

let jwt = sessionStorage.getItem('jwt');
if (jwt) {
	memberScreen.classList.remove('hidden');
	guestScreen.classList.add('hidden');

	const title = memberScreen.querySelector('h1');

	STRAPI.getUser().then(user => {
		title.innerHTML = `Welcome back, ${user.username}`;
	});

} else {
	memberScreen.classList.add('hidden');
	guestScreen.classList.remove('hidden');

	document.querySelector('#books-btn').classList.add('hidden');
	document.querySelector('#logout-btn').classList.add('hidden');
}


loginBtn.addEventListener('click', _ => {
	STRAPI.formLogin().then(() => {
		location.reload();
	}).catch(_ => {
		loginError.className = 'error-msg';
	});
});

registerBtn.addEventListener('click', _ => {
	STRAPI.formRegister().then(() => {
		location.reload();
	}).catch(_ => {
		registerError.className = 'error-msg';
	});
});


STRAPI.getAllPosts().then(response => {
	console.log(response);
});

console.log('Main ran!');