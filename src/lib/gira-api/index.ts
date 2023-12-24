import { dev } from '$app/environment';
import { accountInfo, currentTrip, stations, token, tripRating, type StationInfo } from '$lib/stores';
import { CapacitorHttp, type HttpResponse } from '@capacitor/core';
import { get } from 'svelte/store';
import type { Mutation, Query } from './types';
type Q<T extends (keyof Query)[]> = {[K in T[number]]:Query[K]};
type M<T extends (keyof Mutation)[]> = {[K in T[number]]:Mutation[K]};

const retries = 3;

async function mutate<T extends(keyof Mutation)[]>(body:any): Promise<M<T>> {
	let res: HttpResponse = { status: 0, data: {}, headers: {}, url: '' };
	for (let tryNum = 0; tryNum < retries; tryNum++) {
		res = await CapacitorHttp.post({
			url: 'https://apigira.emel.pt/graphql',
			headers: {
				'User-Agent': 'Gira/3.2.8 (Android 34)',
				'content-type': 'application/json',
				'authorization': `Bearer ${get(token)?.accessToken}`,
			},
			data: body,
		});
		if (res.status >= 200 && res.status < 300) {
			console.log(res);
			return res.data.data as Promise<M<T>>;
		}
	}
	throw new Error(res.data.errors || res.status);
}
async function query<T extends(keyof Query)[]>(body:any): Promise<Q<T>> {
	let res: HttpResponse = { status: 0, data: {}, headers: {}, url: '' };
	for (let tryNum = 0; tryNum < retries; tryNum++) {
		res = await CapacitorHttp.post({
			url: 'https://apigira.emel.pt/graphql',
			headers: {
				'User-Agent': 'Gira/3.2.8 (Android 34)',
				'content-type': 'application/json',
				'authorization': `Bearer ${get(token)?.accessToken}`,
			},
			data: body,
		});
		console.log(res);
		if (res.status >= 200 && res.status < 300) {
			return res.data.data as Promise<Q<T>>;
		}
	}
	throw new Error(res.data.errors || res.status);
}

export async function getStations(): Promise<Q<['getStations']>> {
	const req = query<['getStations']>({
		'operationName': 'getStations',
		'variables': {},
		'query': 'query getStations {getStations {code, description, latitude, longitude, name, bikes, docks, serialNumber, assetStatus }}',
	});
	return req;
}

export async function updateStations() {
	getStations().then(maybeStations => {
		if (maybeStations.getStations === null || maybeStations.getStations === undefined) return;
		const stationsList:StationInfo[] = [];
		maybeStations.getStations.forEach(station => {
			if (station === null || station === undefined) return;
			const { code, name, description, latitude, longitude, bikes, docks, serialNumber, assetStatus } = station;
			if (code === null || code === undefined || name === null ||
        name === undefined || description === undefined ||
        latitude === null || latitude === undefined || longitude === null ||
        longitude === undefined || bikes === null || bikes === undefined ||
        docks === null || docks === undefined || serialNumber === null ||
        serialNumber === undefined || assetStatus === null || assetStatus === undefined
			) {
				console.log('invalid station', station);
				return;
			}
			stationsList.push({ code, name, description, latitude, longitude, bikes, docks, serialNumber, assetStatus });
		});
		stations.set(stationsList);
	});
}

export async function getStationInfo(stationId: string): Promise<Q<['getBikes', 'getDocks']>> {
	const req = query<['getBikes', 'getDocks']>({
		'variables': { input: stationId },
		'query': `query { 
				getBikes(input: "${stationId}") { battery, code, name, kms, serialNumber, type, parent }
				getDocks(input: "${stationId}") { ledStatus, lockStatus, serialNumber, code, name }
		}`,
	});
	return req;
}

export async function getBikes(stationId: string): Promise<Q<['getBikes']>> {
	const req = query<['getBikes']>({
		'variables': { input: stationId },
		'query': `query ($input: String) { getBikes(input: $input) { type, kms, battery, serialNumber, assetType, assetStatus, assetCondition, parent, warehouse, zone, location, latitude, longitude, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version }}`,
	});
	return req;
}

export async function getDocks(stationId: string): Promise<Q<['getDocks']>> {
	const req = query<['getDocks']>({
		'variables': { input: stationId },
		'query': `query ($input: String) { getDocks(input: $input) { ledStatus, lockStatus, serialNumber, assetType, assetStatus, assetCondition, parent, warehouse, zone, location, latitude, longitude, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version }}`,
	});
	return req;
}

export async function reserveBike(serialNumber: string) {
	if (dev) {
		console.log('mock reserveBike');
		return { reserveBike: true };
	} else {
		const req = mutate<['reserveBike']>({
			'variables': { input: serialNumber },
			'query': `mutation ($input: String) { reserveBike(input: $input) }`,
		});
		return req;
	}
}

export async function cancelBikeReserve() {
	const req = mutate<['cancelBikeReserve']>({
		'variables': {},
		'query': `mutation { cancelBikeReserve }`,
	});
	return req;
}

export async function startTrip() {
	if (dev) {
		console.log('mock startTrip');
		await new Promise(resolve => setTimeout(resolve, 2000));
		return { startTrip: true };
	} else {
		const req = mutate<['startTrip']>({
			'variables': {},
			'query': `mutation { startTrip }`,
		});
		return req;
	}
}
// // returns an int or float of the active trip cost
// async function get_active_trip_cost(){
//     response = await make_post_request("https://apigira.emel.pt/graphql", JSON.stringify({
//         "operationName": "activeTripCost",
//         "variables": {},
//         "query": "query activeTripCost {activeTripCost}"
//     }), user.accessToken)
//     return response.data.activeTripCost
// }

export async function getActiveTripCost() {
	const req = query<['activeTripCost']>({
		'variables': {},
		'query': `query { activeTripCost }`,
	});
	return req;
}

export async function getActiveTrip() {
	const req = query<['activeTrip']>({
		'variables': {},
		'query': `query { activeTrip { code, startDate, endDate, cost, client, tripStatus, version } }`,
	});
	return req;
}

export async function getPointsAndBalance() {
	const req = query<['client']>({
		'variables': {},
		'query': `query { client { balance, bonus } }`,
	});
	// console.log(req);
	return req;
}

export async function updateAccountInfo() {
	getPointsAndBalance().then(maybePointsAndBalance => {
		if (maybePointsAndBalance.client === null || maybePointsAndBalance.client === undefined || maybePointsAndBalance.client.length <= 0) return;
		const { balance, bonus } = maybePointsAndBalance.client[0]!;
		if (balance === null || balance === undefined || bonus === null || bonus === undefined) return;
		accountInfo.update(ai => (
			{ subscription: ai?.subscription ?? null, balance, bonus }
		));
	});
	// console.log('client', maybeClient.client);
}

export async function getSubscriptions() {
	const req = query<['activeUserSubscriptions']>({
		'variables': {},
		'query': `query { activeUserSubscriptions { expirationDate subscriptionStatus name type active } }`,
	});
	// console.log(req);
	return req;
}

export async function updateSubscriptions() {
	getSubscriptions().then(maybeSubscriptions => {
		if (maybeSubscriptions.activeUserSubscriptions === null || maybeSubscriptions.activeUserSubscriptions === undefined || maybeSubscriptions.activeUserSubscriptions.length <= 0) return;
		// console.log(maybeSubscriptions.activeUserSubscriptions);
		const { active, expirationDate, name, subscriptionStatus, type } = maybeSubscriptions.activeUserSubscriptions[0]!;
		accountInfo.update(ai => (
			{ balance: ai?.balance ?? 0, bonus: ai?.bonus ?? 0, subscription: { active: active!, expirationDate: new Date(expirationDate), name: name!, subscriptionStatus: subscriptionStatus!, type: type ?? 'unknown' } }
		));
	});
}

export async function getTrip(tripCode:string) {
	const req = query<['getTrip']>({
		'variables': { input: tripCode },
		'query': `query ($input: String) { getTrip(input: $input) { user, asset, startDate, endDate, startLocation, endLocation, distance, rating, photo, cost, startOccupation, endOccupation, totalBonus, client, costBonus, comment, compensationTime, endTripDock, tripStatus, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version } }`,
	});
	return req;
}

export async function getActiveTripInfo() {
	const req = query<['activeTrip']>({
		'variables': {},
		'query': `query { activeTrip { user, asset, startDate, endDate, startLocation, endLocation, distance, rating, photo, cost, startOccupation, endOccupation, totalBonus, client, costBonus, comment, compensationTime, endTripDock, tripStatus, code, name, description, creationDate, createdBy, updateDate, updatedBy, defaultOrder, version } }`,
	});
	return req;
}

export async function updateActiveTripInfo() {
	getActiveTripInfo().then(maybeTrips => {
		if (maybeTrips.activeTrip === null || maybeTrips.activeTrip === undefined || maybeTrips.activeTrip.code === 'no_trip' || maybeTrips.activeTrip.asset === 'dummy') {
			currentTrip.set(null);
			return;
		}
		const {
			asset,
			startDate,
			distance,
			code,
			// user,
			// endDate,
			// startLocation,
			// endLocation,
			// rating,
			// photo,
			// cost,
			// startOccupation,
			// endOccupation,
			// totalBonus,
			// client,
			// costBonus,
			// comment,
			// compensationTime,
			// endTripDock,
			// tripStatus,
			// name,
			// description,
			// creationDate,
			// createdBy,
			// updateDate,
			// updatedBy,
			// defaultOrder,
			// version,
		} = maybeTrips.activeTrip!;
		currentTrip.update(ct => (
			{
				code: code!,
				bikeId: asset!,
				startPos: ct?.startPos ?? null,
				destination: ct?.destination ?? null,
				distance: distance!,
				distanceLeft: ct?.distanceLeft ?? null,
				speed: ct?.speed ?? 0,
				startDate: new Date(startDate!),
				predictedEndDate: ct?.predictedEndDate ?? null,
				arrivalTime: ct?.predictedEndDate ?? null,
				finished: false,
			}
		));
	});
}
//
// tripHistory(pageInput: PageInput): [TripHistory_TripDetail]

// input PageInput {
//   _pageNum: Int
//   _pageSize: Int
// }

//type TripHistory_TripDetail {
//   code: String
//   startDate: DateTime
//   endDate: DateTime
//   rating: Int
//   bikeName: String
//   startLocation: String
//   endLocation: String
//   bonus: Int
//   usedPoints: Int
//   cost: Float
//   bikeType: String
// }

export async function getTripHistory(pageNum:number, pageSize:number) {
	const req = query<['tripHistory']>({
		'variables': { input: { _pageNum: pageNum, _pageSize: pageSize } },
		'query': `query ($input: PageInput) { tripHistory(pageInput: $input) { code, startDate, endDate, rating, bikeName, startLocation, endLocation, bonus, usedPoints, cost, bikeType } }`,
	});
	return req;
}

export async function getUnratedTrips(pageNum:number, pageSize:number) {
	const req = query<['unratedTrips']>({
		'variables': { input: { _pageNum: pageNum, _pageSize: pageSize } },
		'query': `query ($input: PageInput) { unratedTrips(pageInput: $input) { code, startDate, endDate, rating, startLocation, endLocation, cost, costBonus, asset } }`,
	});
	return req;
}

export async function updateLastUnratedTrip() {
	return getUnratedTrips(0, 1).then(maybeTrips => {
		if (maybeTrips.unratedTrips === null || maybeTrips.unratedTrips === undefined || maybeTrips.unratedTrips.length <= 0) return;
		const unratedTrip = maybeTrips.unratedTrips[0];
		if (unratedTrip == null || unratedTrip.code == null || unratedTrip.asset == null || unratedTrip.costBonus == null) return;
		const endToNow = (new Date).getTime() - new Date(unratedTrip.endDate).getTime();
		// check if 24h have passed
		if (endToNow < 24 * 60 * 60 * 1000) return;

		tripRating.set({
			currentRating: {
				code: unratedTrip.code,
				// probably have to translate asset to bike id
				bikeId: unratedTrip.asset,
				startDate: new Date(unratedTrip.startDate),
				endDate: new Date(unratedTrip.endDate),
				tripPoints: unratedTrip.costBonus,
			},
		});
	});
}

// input RateTrip_In {
//   code: String
//   rating: Int
//   description: String
//   attachment: Attachment
// }
export async function rateTrip(tripCode:string, tripRating:number, tripComment?:string, tripAttachment?:File) {
	if (tripComment === undefined) tripComment = '';
	const actualAttachment = tripAttachment === undefined ? null : tripAttachment;
	const req = mutate<['rateTrip']>({
		'variables': {
			in: {
				code: tripCode,
				rating: tripRating,
				description: tripComment,
				attachment: actualAttachment !== null ? {
					bytes: actualAttachment?.arrayBuffer() ?? null,
					fileName: `img_${tripCode}.png`,
					mimeType: 'image/png',
				} : null,
			},
		},
		'query': `mutation ($in: RateTrip_In) { rateTrip(in: $in) }`,
	});
	return req;
}

export async function tripPayWithNoPoints(tripCode: string) {
	const req = mutate<['tripPayWithNoPoints']>({
		'variables': { input: tripCode },
		'query': `mutation ($input: String) { tripPayWithNoPoints(input: $input) }`,
	});
	return req;
}
export async function tripPayWithPoints(tripCode:string) {
	const req = mutate<['tripPayWithPoints']>({
		'variables': { input: tripCode },
		'query': `mutation ($input: String) { tripPayWithPoints(input: $input) }`,
	});
	return req;
}