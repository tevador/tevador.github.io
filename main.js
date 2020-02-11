var info = null;
var workers = [];
var hashes = 0;
var last_hr = 0;
var running = false;
const hashing_blob = '0c0cef9287f20599a6012a1096274b9e476722da2bc03c18b6992579d245359404b8dca0856304000000002112855defe903a1cbcf2df6be59b9cc7e29ad21c171840e4f4cf46c2af4e4fc0c';
const seed_hash = '6f554050a4fbe52b95f1d8843e2a235de0f7997e002b7f01fbba16d9263eacab';

function set_hashes(count) {
	hashes = count;
	$('#hashes').text(hashes);
}

function set_error(err) {
	$('#error').text(err);
}

function update_hr() {
	var now = Date.now();
	let hr = 1000 * hashes / (now - last_hr);
	$('#hr').text(hr.toFixed(1));
}

async function randomx_info() {
	let response = await fetch('http://localhost:39093/info');
	let info = await response.json();
	return info;
}

async function randomx_seed(seed) {
	let response = await fetch('http://localhost:39093/seed', {
		method: 'POST',
		body: seed,
		headers: {
			'Content-Type': 'application/x.randomx+hex'
		}
	});
	if (response.status != 204) {
		throw Error('randomx_seed: unexpected status HTTP ' + response.status);
	}
}

async function init() {
	try {
		info = await randomx_info();
	}
	catch(err) {
		console.error(err);
		set_error('service is not accessible');
		return;
	}

	$('#threads').prop('max', info.threads);
	$('#threads').val(info.threads);

	if (info.seed != seed_hash) {
		$('#button').val('Initializing...');
		console.log('Initializing with seed ' + seed_hash + '...');
		await randomx_seed(seed_hash);
	}

	$('#threads').prop('disabled', false);
	$('#button').val('Start');
	$('#button').prop('disabled', false);
}

function receive_hashes(e) {
	set_hashes(hashes + e.data.count);	
}

function benchmark() {
	if (running) {
		$('#threads').prop('disabled', false);
		$('#button').val('Start');
		for (let i = 0; i < workers.length; ++i) {
			console.log('Stopping worker ' + i + '...');
			workers[i].terminate();
		}
		workers = [];
		running = false;
		set_hashes(0);
		return;
	}

	var numThreads = parseInt($('#threads').val());
	$('#threads').prop('disabled', true);

	console.log('Starting ' + numThreads + ' worker(s)...');

	for (let i = 0; i < numThreads; ++i) {
		let w = new Worker('worker.js');
		w.onmessage = receive_hashes;
		w.postMessage({ hashing_blob, seed_hash, offset: i, stride: numThreads });
		workers.push(w);
	}
	running = true;
	last_hr = Date.now();
	$('#button').val('Stop');
	$('#button').click(stop);
}

function validate_threads() {
	if (info) {
		var numThreads = parseInt($('#threads').val());
		if (numThreads > info.threads) {
			$('#threads').val(info.threads);
		} else if(numThreads < 1) {
			$('#threads').val(1);
		}
	}
}

$(document).ready(function() {
	console.log(location.origin);
	$('#origin').text(location.origin);
	setInterval(update_hr, 2000);
	$('#button').click(benchmark);
	$('#threads').change(validate_threads);
	init();
});