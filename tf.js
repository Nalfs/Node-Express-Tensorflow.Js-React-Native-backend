const tf = require('@tensorflow/tfjs-node')

const { Image, createCanvas } = require('canvas')
const getRawBody = require('raw-body')
const fs = require('fs')

const frozen_graph = "file://frozen_model/tensorflowjs_model.pb";
const weights = "file://frozen_model/weights_manifest.json";

// let model;
let predictor;

async function init() {
    try {
        // model = await tf.loadModel('file://model/model.json');
        predictor = await tf.loadFrozenModel(frozen_graph, weights);
        console.log('Tensorflow model loaded');
    } catch (e) {
        console.log(e);
    }
}

init();

async function handler(req, res) {
    if (!predictor) {
        res.status(500).send("model not ready");
        return;
    }
    console.log('Request: accepted')

    const buffer = await getRawBody(req);
    const image = await createImageFromJpgBase64(buffer.toString(), 256, 256);

    // // convert image to tensor // [old model]
    // let tensor = tf.fromPixels(image)
    //     .resizeNearestNeighbor([28, 28])
    //     .toFloat()
    //     .mean(2)
    //     .expandDims(2)
    //     .expandDims();

    // // get prediction
    // const result = model.predict(tensor);

    // // handle prediction
    // result.print();

    const chessboard = runPrediction(image);

    res.json(chessboard);
};

async function createImageFromJpgBase64(base64, width, height) {
    const image = new Image();
    image.onerror = (error) => {
        console.log("image error", error);
    };
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    image.src = "data:image/jpg;base64," + base64;
    ctx.drawImage(image, 0, 0);

    const out = fs.createWriteStream('test.png');
    const stream = canvas.createPNGStream()
    stream.pipe(out)
    out.on('finish', () =>  console.log('The PNG file was created.'))

    return canvas;
}

function getTiles(img_256x256) {
    var files = []; // 8 columns.
    for (var i = 0; i < 8; i++) {
      files[i] = img_256x256.slice([0,0+32*i,0],[32*8,32,1]).reshape([8,1024]);
    }
    return tf.concat(files);
}

function getLabeledPiecesAndFEN(predictions) {
    var pieces = [];
    for (var rank = 8 - 1; rank >= 0; rank--) {
      pieces[rank] = [];
      for (var file = 0; file < 8; file++) {
        pieces[rank][file] = '1KQRBNPkqrbnp'[predictions[rank+file*8]]
      }
    }

    var basic_fen = pieces.map(x => x.join('')).join('/')
      .replace(RegExp('11111111', 'g'), '8')
      .replace(RegExp('1111111', 'g'), '7')
      .replace(RegExp('111111', 'g'), '6')
      .replace(RegExp('11111', 'g'), '5')
      .replace(RegExp('1111', 'g'), '4')
      .replace(RegExp('111', 'g'), '3')
      .replace(RegExp('11', 'g'), '2');

    basic_fen += ' w - - 0 1';

    return {piece_array: pieces, fen:basic_fen};
}

function runPrediction(img) {
    const img_data = tf.fromPixels(img).asType('float32');
    const tiles = getTiles(img_data);

    const output = predictor.execute({Input: tiles, KeepProb: tf.scalar(1.0)}); // NOTE - global used here.
    const raw_predictions = output.dataSync();

    const chessboard = getLabeledPiecesAndFEN(raw_predictions);
    return chessboard;
}

module.exports = handler;