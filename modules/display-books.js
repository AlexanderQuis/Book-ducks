//import * from "./api.js";
const booksList = document.querySelector('#books-content');
const options   = document.querySelector('#options');

const btnFav  = document.querySelector('#btn-fav');
const btnSave = document.querySelector('#btn-save');
const btnLike = document.querySelector('#btn-like');
const btnDisL = document.querySelector('#btn-dislike');

let selectedBookID = null;
function getCurrentBookElement() {
	return document.querySelector('#book-' + selectedBookID);
}

function refreshBook(book) {
	const bookElement = document.querySelector('#book-' + book.id);
	const icon  = bookElement.querySelector('#book-personal-rating');
	const stars = bookElement.querySelectorAll('#book-overall-rating > img:not(.user-review-icon)');

	const submissions = book.scoreSubmissions;
	const averageScore = book.score / submissions;
	for (let i = 0; i < stars.length; i++) {
		let fileName = 'star-empty';
		let starValue = i;

		if (averageScore >= starValue / 5) {
			fileName = 'star-checked';

		} else if (averageScore >= (starValue - 0.5) / 5) {
			fileName = 'star-half';
		}

		const starElement = stars[i];
		starElement.src = `svg/${fileName}.svg`;
	}

	const rating = book.clientRating;
	icon.src = `svg/${rating === 1 && 'thumbs-up' || 'thumbs-down'}.png`;
	icon.className = "user-review-icon" + (rating === 0 && ' hidden' || ' ');

	bookElement.querySelector('#ratings-submitted').innerHTML = submissions + ' ratings';
}

function refreshOptions(book) {
	let rating = book.clientRating;

	btnFav.innerHTML = book.isFavorited && 'unfavorite' || 'favorite';
	btnLike.className = 'review-btn ' + (rating === 1 && 'highlight' || ' ');
	btnDisL.className = 'review-btn ' + (rating ===-1 && 'highlight' || ' ');

	refreshBook(book);	
}

btnLike.addEventListener('click', _ => {
	STRAPI.rateBook(selectedBookID, 1).then(refreshOptions);
})
btnDisL.addEventListener('click', _ => {
	STRAPI.rateBook(selectedBookID, -1).then(refreshOptions);
})

function favoriteBook() {
	if (!selectedBookID) {return;}
	
	const bookElement = getCurrentBookElement();
	const star = bookElement.querySelector('#is-favorite');
	
	STRAPI.favoriteBook(selectedBookID).then(book => {
		star.src = `svg/${book.isFavorited && 'star-checked' || 'star-empty'}.svg`;
		refreshOptions(book);
	});
}

function bookPressed(newBookID) {
	if (selectedBookID) {
		const element = getCurrentBookElement();
		element.classList.remove('selected');
	}

	if (selectedBookID == newBookID) {
		selectedBookID = null;
		options.classList.add('hidden');
		return;
	}

	STRAPI.findBookFromId(newBookID).then(refreshOptions)

	bookClicked = true;
	selectedBookID = newBookID;

	options.classList.remove('hidden');
	getCurrentBookElement().classList.add('selected');	
}


btnFav.addEventListener('click', favoriteBook);

const showBooks = async filterByFav => {
	const user = await STRAPI.getUser();

	const favorites = [];
	user.favorites.forEach(favBook => {
		favorites.push(favBook.id);
	})

	STRAPI.booksForEach((book, bookID) => {
		if (filterByFav && !book.isFavorited) {
			return;
		}
		const imageURL = book.cover.data.attributes.url;

		const bookElement = document.createElement('div')
		bookElement.className = 'book-wrapper';
		bookElement.id = 'book-' + bookID;

		bookElement.addEventListener('click', _ => {
			bookPressed(bookID);
		});

		const isFavorited = favorites.find(targetID => targetID == bookID);

		bookElement.innerHTML = `
		<div class="book">
			<div class="title-wrapper">
				<h2>${book.title}</h2>
				<img src="svg/${isFavorited && 'star-checked' || 'star-empty'}.svg" id="is-favorite">
			</div>
			
			<img src="${API_BASE + imageURL}" class="cover">
			<div id="book-overall-rating">
				<img src="svg/star-empty.svg">
				<img src="svg/star-empty.svg">
				<img src="svg/star-empty.svg">
				<img src="svg/star-empty.svg">
				<img src="svg/star-empty.svg">
				<span id="ratings-submitted">0 ratings</span>
				<img src="svg/thumbs-up.png" class="user-review-icon" id="book-personal-rating">
			</div>
		</div>
		`;

		booksList.appendChild(bookElement);
		refreshBook(book);

	}).catch(err => {
		console.log('Failed to load books')
		console.log(err);
	})	
}

console.log('Books ran!');