function pack_nonce(arr, offset, nonce) {
	nonce = nonce | 0;
	for (let i = 0; i < 4; ++i) {
		arr[offset++] = nonce % 256;
		nonce /= 256;
	}
}

function hex_to_array(hex) {
	return new Uint8Array(hex.match(/[\da-f]{2}/gi).map(h => parseInt(h, 16)));
}

async function randomx_batch(batch) {
	let response = await fetch('http://localhost:39093/batch', {
		method: 'POST',
		body: batch,
		headers: {
            'Content-Type': 'application/x.randomx.batch+bin',
            'Accept': 'application/x.randomx.batch+bin'
		}
	});
	if (response.status != 200) {
		throw Error('randomx_seed: unexpected status HTTP ' + response.status);
    }
    return await response.arrayBuffer();
}

var hashing_blob;
var batch;
var nonce;
var stride;
var seed_hash;
const batchSize = 256;

async function run() {
    let jobSize = hashing_blob.length + 1;
    batch = new Uint8Array(batchSize * jobSize);
    
    for (let i = 0; i < batchSize; ++i) {
        batch[i * jobSize] = hashing_blob.length;
        for (let j = 0; j < hashing_blob.length; ++j) {
            batch[i * jobSize + j + 1] = hashing_blob[j];
        }
    }

    for(;;) {
        for (let i = 0; i < batchSize; ++i) {
            pack_nonce(hashing_blob, i * jobSize + 39, nonce);
            nonce += stride;
        }
        var result = await randomx_batch(batch);
        postMessage({ count: batchSize });
    }
}

onmessage = function(e) {
    console.log('Worker ' + e.data.offset + ' starting');
    nonce = e.data.offet;
    stride = e.data.stride;
    seed_hash = e.data.seed_hash;
    hashing_blob = hex_to_array(e.data.hashing_blob);
    run();
}