function getValuesFrom(form) {
	const fields = form.querySelectorAll('input');

	let payload = {}
	fields.forEach(element => {
		payload[element.name] = element.value;
	})

	return payload;
}

function getRelations(relationName, user) {
	const result = [];
	user[relationName].forEach(favBook => {
		result.push(favBook.id);
	})

	return result;
}

function clamp(number, min, max) {
	return Math.max(min, Math.min(number, max));
}


const API_BASE = 'http://localhost:1337';
const STRAPI = {
	cache: {
		posts: null,
		profile: null,
		books: null,
		reviews: null,
	},

	getAllPosts: function(forced) {
		return new Promise((resolve, failed) => {
			if (!!this.cache.posts && !forced) {
				return resolve(this.cache.posts);
			}

			axios({
				method: 'get',
				url: API_BASE + '/api/posts',

			}).then(response => {
				const data = response.data;
				this.cache.posts = data;

				resolve(data);

			}).catch(error => {
				console.log(error);

				failed(error);
			});
		});
	},

	formRegister: function() {
		const registerForm = document.querySelector('#register-form');
		const payload = getValuesFrom(registerForm);

		return new Promise((resolve, failed) => {
			axios({
				method: 'post',
				url: API_BASE + '/api/auth/local/register',
				data: payload

			}).then(response => {
				const data = response.data;
				sessionStorage.setItem('jwt', data.jwt);

				console.log(data);
				resolve(data);

			}).catch(error => {
				const statusCode = error.response.status;
				console.log('[ERROR registerUser] status code: ' + statusCode);
				failed(statusCode);
			})
		})
	},
	formLogin: function() {
		const loginForm = document.querySelector('#login-form');
		const payload = getValuesFrom(loginForm);
		payload.identifier = payload.username;
		delete payload.username;

		return new Promise((resolve, failed) => {
			axios({
				method: 'post',
				url: API_BASE + '/api/auth/local',
				data: payload

			}).then(response => {
				const data = response.data;
				sessionStorage.setItem('jwt', data.jwt);

				console.log(data);
				return resolve(data);

			}).catch(error => {
				const statusCode = error.response.status;
				console.log('[ERROR loginUser] status code: ' + statusCode);
				return failed(statusCode);
			})
		})
	},

	getUser: function() {
		const jwt = sessionStorage.getItem('jwt');
		if (!jwt) {return console.log('NO JWT');}

		if (this.cache.profile) {
			return Promise.resolve(this.cache.profile);
		}

		return new Promise((resolve, failed) => {
			axios({
				method: 'get',
				url: API_BASE + '/api/users/me?populate=*',

				headers: {Authorization: 'Bearer ' + jwt}

			}).then(response => {
				const data = response.data;
				this.cache.profile = data;

				console.log(data);

				resolve(data);

			}).catch(error => {
				console.log(error);
				failed(error);
			})
		})
	},

	getReviews: function() {
		if (this.cache.reviews) {
			return Promise.resolve(this.cache.reviews);
		}

		return axios({
			method: 'get',
			url: API_BASE + '/api/comments?populate=*',

		}).then(reviews => {
			this.cache.reviews = reviews;
			return reviews;
		});
	},

	getBookRating: function(book, bookID, user) {
		const reviews = user.reviews;

		const rating = reviews.find(reviewData => {
			const reviewID = reviewData.id;
			return !!book.reviews.data.find(bookReview => bookReview.id === reviewID);
		});

		return rating;
	},

	getAllBooks: async function() {
		const jwt = sessionStorage.getItem('jwt');
		if (!jwt) {return console.log('NO JWT');}
		if (this.cache.books) {return Promise.resolve(this.cache.books);}

		const user     = await this.getUser();
		const bookData = await axios({
			method: 'get',
			url: API_BASE + '/api/books?populate=*',
			headers: {Authorization: 'Bearer ' + jwt}
		});

		const books = bookData.data.data;
		this.cache.books = books;

		const favorites = getRelations('favorites', user);
		books.forEach((bookData) => {
			const bookID = bookData.id;
			const book = bookData.attributes;

			const isFav = !!favorites.find(targetID => targetID === bookID);
			const rating = this.getBookRating(book, bookID, user);
			book.clientRating = rating && clamp(rating.score, -1, 1) || 0;
			book.isFavorited = isFav;
			book.id = bookID;

			book.score = 0;
			book.scoreSubmissions = 0;
			book.reviews.data.forEach(review => {
				const score = clamp(review.attributes.score, -1, 1);
				book.score += score;

				if (score !== 0) {
					book.scoreSubmissions += 1;
				}
			});
		});

		//console.log('books!', books);

		return books;
	},

	booksForEach: async function(callback) {
		const books = await this.getAllBooks();

		books.forEach(book => {
			callback(book.attributes, book.id);
		})
	},

	findBookFromId: async function(targetBookID) {
		const books = await this.getAllBooks();

		for (let i = 0; i < books.length; i++) {
			let book = books[i];

			if (book.id === targetBookID) {
				return book.attributes;
			}
		}
	},

	findAllFavorites: async function(){
		const favs = [];
		await this.booksForEach((book, bookID) => {
			if (book.isFavorited) {
				favs.push(bookID);
			}
		})

		return favs;
	},

	favoriteBook: async function(bookID) {
		const jwt = sessionStorage.getItem('jwt');
		if (!jwt) {return Promise.reject('NO JWT');}

		const user = await this.getUser();
		const favorites = await this.findAllFavorites(user);
		const book = await this.findBookFromId(bookID);
		
		if (book.isFavorited) {
			const favIndex = favorites.findIndex(targetID => targetID == bookID);
			favorites.splice(favIndex, 1);
			console.log('Book ' + bookID + ' has been removed from favorites!');

		} else {
			favorites.push(bookID);
			console.log('Book ' + bookID + ' is now favorited!');
		}

		book.isFavorited = !book.isFavorited;

		//console.log(book, favorites);

		axios({
			method: 'put',
			url: API_BASE + '/api/users/' + user.id,
			headers: {Authorization: 'Bearer ' + jwt},

			data: {favorites: favorites}
		}).then().catch(err => console.log(err));

		return book;
	},

	rateBook: async function(bookID, score) {
		const jwt = sessionStorage.getItem('jwt');
		if (!jwt) {return Promise.reject('NO JWT');}

		score = clamp(score, -1, 1);

		const user = await this.getUser();
		const book = await this.findBookFromId(bookID);

		let rating = this.getBookRating(book, bookID, user);
		if (rating) {
			const prevScore = rating.score || 0;
			const preScore = score;
			if (rating.score === score) {
				score = 0;
			}

			return axios({
				method: 'put',
				url: API_BASE + '/api/comments/' + rating.id,
				headers: {Authorization: 'Bearer ' + jwt},

				data: {"data": {"score": score}}

			}).then(response => {
				rating.score = score;
				book.clientRating = score;
				book.score = book.score - prevScore + score;

				if (prevScore === 0) {
					book.scoreSubmissions += 1;
				}

				if (score === 0) {
					book.scoreSubmissions -= 1;
				}

				return Promise.resolve(book);

			}).catch(err => console.log(err));
		} else {
			return axios({
				method: 'post',
				url: API_BASE + '/api/comments',
				headers: {Authorization: 'Bearer ' + jwt},

				data: {"data": {
					"score": score,
					"book": bookID,
					"from": user.id
				}}
			}).then(rating => {
				rating = rating.data.data;

				book.clientRating = score;
				book.scoreSubmissions += 1;

				book.reviews.data.push(rating);
				user.reviews.push(rating);

				//console.log('success!');
				//console.log(rating);

				return Promise.resolve(book);

			}).catch(err => console.log(err));
		}
	}
}

/* export {STRAPI, API_BASE} */