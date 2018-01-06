const _ = require('lodash'),
	auth = require('./auth.json'),
	Discord = require('discord.js'),
	Promise = require('bluebird'),
	request = require('request-promise'),
	urljoin = require('url-join');

const lolApiBaseUrl = 'http://api.lolesports.com/api/v1/';
const scheduleItemRoute = 'scheduleItems?leagueId=';

const naLeagueId = '2';
const euLeagueId = '3';
/*
refreshItems()
	.then(items => {

	});
 */

refreshItems()
	.then( items => {
		const client = new Discord.Client();
		const myItem = items[0];

		client.on('ready', () => {
			console.log('I am ready!');
		});

		client.on('message', message => {
			if (message.content === 'schedule') {
				message.reply(`Yo! ${myItem.name} is Starting! Go Here! ${myItem.url}`);
			}
		});

		client.login(auth.token);

	});

function refreshItems() {
	let startTime = new Date();
	let endTime = new Date();
	endTime.setDate(endTime.getDate() + 15);

	return Promise.join(refreshSchedule(euLeagueId, startTime, endTime), refreshSchedule(naLeagueId, startTime, endTime), (euItems, naItems) => {
		let mergedItems = euItems.concat(naItems);
		return _.sortBy(mergedItems, ['time']);
	} );
}

function refreshSchedule(leagueId, startTime, endTime) {
	return request(urljoin(lolApiBaseUrl, scheduleItemRoute) + leagueId)
		.then( body => {
			return JSON.parse(body)
		})
		.then( response => {
			let currentScheduleItems = filterSchedule(response, startTime, endTime);
			let tournamentId = currentScheduleItems[0].tournament;
			let bracketId = currentScheduleItems[0].bracket;
			let tournaments = response.highlanderTournaments;
			let currentMatches = _.find(tournaments, {id: tournamentId}).brackets[bracketId].matches;

			return getScheduleMap(currentScheduleItems, currentMatches);
		})
}

function filterSchedule(scheduleResponse, startTime, endTime ) {
	let scheduleItems = scheduleResponse.scheduleItems;
	let tournaments = scheduleResponse.highlanderTournaments;

	return _.filter(scheduleItems, function(item) {
		item.scheduledTime =  new Date(Date.parse(item.scheduledTime));
		return item.scheduledTime > startTime && item.scheduledTime < endTime
	});
}

function getMatchName(matches, matchId) {
	return matches[matchId].name
}

function getScheduleMap(currentScheduleItems, currentMatches) {
	return _.map(currentScheduleItems, item => {
		let matchName = getMatchName(currentMatches, item.match);
		let leagueString = getLeagueString(item);
		return {
			name: matchName,
			time: item.scheduledTime,
			leagueString: leagueString,
			url: getMatchUrl(leagueString, matchName),
		}
	})
}

function getLeagueString(item) {
	switch(item.league) {
		case '2':
			return 'na';
		case '3':
			return 'eu';
		default:
			return 'unknown'
	}
}

function getMatchUrl(leagueString, matchName) {
	return `http://www.lolesports.com/en_US/${leagueString}-lcs/${leagueString}_2018_spring/matches/regular_season/${matchName}`;
}