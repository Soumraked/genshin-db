const fs = require('fs');

// THIS SCRIPT GENERATES INDEX.JSON FOR EACH SET OF DATA
// REQUIRES NODE v13+

// if you ask me to explain the code i wrote below, i would reply i dunno

makeIndices();
combineData();

function makeIndices() {
	const design = require('./design.json');
	let language = require('./language.js');
	//language.languages = ["English"]; // do only english for now

	for(const lang of language.languages) {
		let categories = require(`./data/${lang}/categories.json`);
		for(const folder of design.folders) {
			let index = {
				namemap: {}, // maps filename to name
				names: {}, // maps name to filename
				aliases: {}, // maps alias to filename
				categories: {} // maps category to array of filenames
			};
			try {
				if (!fs.existsSync(`./data/${lang}/${folder}`)) continue;

				fs.readdirSync(`./data/${lang}/${folder}`).forEach(filename => {
					if(!filename.endsWith('.json')) return;

					const data = require(`./data/${lang}/${folder}/${filename}`);
					if(data.name === undefined || data.name === "") return; // go next file if this one doesn't have name property

					if(index.namemap[filename] !== undefined) console.log(`Duplicate filename: ${lang}/${folder}: ${filename}`);
					index.namemap[filename] = data.name;
					if(index.names[data.name] !== undefined) console.log(`Duplicate name: ${lang}/${folder}: ${data.name}`);
					index.names[data.name] = filename;

					if(design.altnames[folder] !== undefined) {
						for(let altname of design.altnames[folder]) { // add all the altnames to the index
							let values = data[altname];
							if(values === undefined || values === "") continue;
							if(!Array.isArray(values))
								values = [values];
							for(let val of values) {
								if(val !== undefined && val !== "") {
									if(index.aliases[val] !== undefined && index.aliases[val] !== filename && filename !== 'lumine.json')
										console.log(`Duplicate alias: ${lang}/${folder}: ${altname},${val},${filename}`);
									index.aliases[val] = filename;
								}
							}
						}
					}

					if(design.indexByCategories[folder] === undefined) return; // go next if nothing else to index
					// add additional category indexes
					for(const prop of design.indexByCategories[folder]) {
						let values = data[prop];
						if(values === undefined || values === "" ) continue; // go next if our data doesn't have that category as a property
						if(!Array.isArray(values)) values = [values]; // make into array

						for(let val of values) {
							if(categories[prop] === undefined) console.log("missing category: "+folder+ ","+prop);
							if(prop === "ingredients") val = val.replace(/ x\d$/i, '');
							else if(prop === "birthday") {
								let [month, day] = data.birthdaymmdd.split('/');
								let birthday = new Date(Date.UTC(2000, month-1, day));
								val = birthday.toLocaleString(language.localeMap[lang], { timeZone: 'UTC', month: 'long' });
							}

							//if(categories[prop] === "free" || categories[prop].includes(val)) {
								if(index.categories[val] === undefined) {
									index.categories[val] = [filename];
								} else {
									if(index.categories[val].includes(filename)) console.log(`Duplicate category: ${lang}/${folder}: ${val},${filename}`);
									index.categories[val].push(filename);
								}
							//} else { console.log(filename + " missing val: " + val)}
						}

						// if(categories[prop].includes(data[prop])) {
						// 	let tmp = data[prop];
						// 	if(index[tmp] === undefined)
						// 		index[tmp] = [data.name];
						// 	else
						// 		index[tmp].push(data.name);
						// }
					}
				})

				fs.mkdirSync(`./data/index/${lang}`, { recursive: true });
				fs.writeFileSync(`./data/index/${lang}/${folder}.json`, JSON.stringify(index, null, '\t'));
			} catch(e) {
				if(e.errno === -4058) console.log("no path: " + e.path);
				else console.log(JSON.stringify(e) + e);
				fs.writeFileSync(`./data/index/${lang}/${folder}.json`, JSON.stringify({}, null, '\t'));
			}
		}
		console.log("done "+lang);
	}
}

function combineData() {
	console.log("combining all data and index into one file");
	let mydata = {};
	let myindex = {};
	let language = require('./language.js');
	const design = require('./design.json');

	//language.languages = ["English"]; // do only english for now

	for(const lang of language.languages) {
		mydata[lang] = {};
		myindex[lang] = {};
		for(const folder of design.folders) {
			if (!fs.existsSync(`./data/${lang}/${folder}`)) continue;
			mydata[lang][folder] = {};
			myindex[lang][folder] = require(`./data/index/${lang}/${folder}.json`);

			fs.readdirSync(`./data/${lang}/${folder}`).forEach(filename => {
				if(!filename.endsWith('.json')) return;
				mydata[lang][folder][filename] = require(`./data/${lang}/${folder}/${filename}`);

			});
		}
	}
	fs.writeFileSync(`./data/data.min.json`, JSON.stringify(mydata));
	fs.writeFileSync(`./data/index.min.json`, JSON.stringify(myindex));
}