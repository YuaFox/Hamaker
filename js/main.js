var colors = {};

function closestColor(c, palette) {
    var result = new Uint8ClampedArray(3);
    var r = c[0];
    var g = c[1];
    var b = c[2];
    var closest = Number.MAX_VALUE;
    for (var i = 0; i < palette.length; i+=3) {
	var rp = palette[i];
	var gp = palette[i+1];
	var bp = palette[i+2];
	var sq = Math.pow(r - rp, 2) + Math.pow(g - gp, 2) + Math.pow(b - bp, 2);
	if (sq < closest) {
	    closest = sq;
	    result[0] = rp;
	    result[1] = gp;
	    result[2] = bp;
	}
    }

    return result;
}

function colorReduce(data, width, height, palette) {
    for (var y = 0; y < height*3; y++) {
        for (var x = 0; x < width*3; x++) {
            var idx = (y * width + x)*3;
            closest = closestColor(data.slice(idx,idx+3), palette);
            data[idx] = closest[0];
            data[idx+1] = closest[1];
            data[idx+2] = closest[2];
        }
    }
}

function getBeadHeight(beadWidth) {
    return Math.floor(beadWidth * (height/width));
}

function toBeads(data, width, height, beadWidth) {
    var beadHeight = getBeadHeight(beadWidth);
    var beadWidthBytes = beadWidth * 3;
    var pixelsInBeadWidth = Math.floor(width / beadWidth);
    var pixelsInBeadHeight = Math.floor(height / beadHeight);
    var pixelsInBeadWidthBytes = pixelsInBeadWidth * 4;
    var countInv = 1.0/(pixelsInBeadHeight*pixelsInBeadWidth);
    var accSize = beadWidth*3;
    var acc = new Uint32Array(accSize);
    var widthBytes = width * 4;
    var result = new Uint8ClampedArray(beadWidth * beadHeight * 3);
    for (var by = 0; by < beadHeight; by++) {
	var byImgOffset = by * pixelsInBeadHeight * widthBytes;
	for (var y = 0; y < pixelsInBeadHeight; y++) {
	    var yImgOffset = y * widthBytes;
	    var offset = byImgOffset + yImgOffset;
	    for (var bx = 0; bx < beadWidth; bx++) {
		var bxImg = offset + bx * pixelsInBeadWidthBytes;
		var accIdxRed = bx * 3;
		var accIdxGreen = accIdxRed + 1;
		var accIdxBlue = accIdxRed + 2;
		for (var x = 0; x < pixelsInBeadWidthBytes; x+=4) {
		    var dataIdx = bxImg + x;
		    acc[accIdxRed] += data[dataIdx];
		    acc[accIdxGreen] += data[dataIdx + 1];
		    acc[accIdxBlue] += data[dataIdx + 2];
		}
	    }
	}
	var offset = by * beadWidthBytes;
	for (var bx = 0; bx < accSize; bx+=3) {
	    var rp = offset + bx;
	    var bx1 = bx + 1;
	    var bx2 = bx + 2;
	    result[rp] = Math.round(acc[bx] * countInv);
	    result[rp+1] = Math.round(acc[bx1] * countInv);
	    result[rp+2] = Math.round(acc[bx2] * countInv);
	    acc[bx] = 0;
	    acc[bx1] = 0;
	    acc[bx2] = 0;
	}
    }
    return {width: beadWidth,
	    height: beadHeight,
	    data: result};
}

var pixelsData = null;
var ctx = null;
var canvas = null;
var width = 0;
var height = 0;
var mBeadWidth = 50;
var mBeadWidthSize = 10;
var mBeads = null;
var mPosX = 0;
var mPosY = 0;
var mUpdateBeads = true;
var mDither = false;
var mode = 0;

function addBWidth(){
    mBeadWidth++;
    while(width%mBeadWidth > mBeadWidth/10){
        mBeadWidth++;
    }
    $("#bead-count").html(mBeadWidth);
    mUpdateBeads = true;
    renderBeads(true);
}

function subBWidth(){
    mBeadWidth--;
    while(width%mBeadWidth > mBeadWidth/10 && mBeadWidth !== 0){
        mBeadWidth--;
    }
    if(mBeadWidth === 0){
        alert("You can't do it smaller!");
        mBeadWidth = 1;
    }
    $("#bead-count").html(mBeadWidth);
    mUpdateBeads = true;
    renderBeads(true);
}

function render(src){
    var img = new Image();
    img.onload = function(){
	tempCanvas = document.createElement('canvas');
	tempCanvas.width = img.width;
	tempCanvas.height = img.height;
	tempCanvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
	width = img.width;
	height = img.height;
	var pixels = tempCanvas.getContext('2d').getImageData(0, 0, img.width, img.height);
	pixelsData = pixels.data;
        $("#app-canvas-container").css("width", $("#app-container").width());
        $("#app-canvas-container").css("height", $("#app-container").height());
	renderBeads(true);
    };
    img.src = src;
}

function paletteToTyped(palette) {
    r = new Uint8ClampedArray(palette.size * 3);
    var i = 0;
    palette.forEach(function(value) {
	rgb = rgbStrToColor(value);
	r[i] = rgb.r;
	r[i+1] = rgb.g;
	r[i+2] = rgb.b;
	i+=3;
    });
    return r;
}

function renderBeads() {
    if(width === 0) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    colors = {};
    var palette = paletteToTyped(mPalette);
    if (mUpdateBeads) {
	mUpdateBeads = false;
	mBeads = toBeads(pixelsData, width, height, mBeadWidth);
	var beadHeight = getBeadHeight(mBeadWidth);
	colorReduce(mBeads.data, mBeadWidth, beadHeight, palette);
    }

    canvas.width  = mBeads.width*mBeadWidthSize;
    canvas.height = mBeads.height*mBeadWidthSize;

    var halfBeadWidthSize = mBeadWidthSize/2;
    var twoPi = 2*Math.PI;
    var xOffset = mPosX + halfBeadWidthSize;
    var yOffset = mPosY + halfBeadWidthSize;
    for (var y = 0; y < mBeads.height; y++) {
	for (var x = 0; x < mBeads.width; x++) {
	    var p = (y * mBeads.width + x)*3;
            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + mBeads.data[p] + ',' + mBeads.data[p+1] + ',' + mBeads.data[p+2] + ",255)";
            switch(mode){
                case 0:
                    ctx.arc(xOffset + x*mBeadWidthSize,yOffset + y*mBeadWidthSize, halfBeadWidthSize,0, twoPi, true);
                    break;
                case 1:
                    ctx.rect(x*mBeadWidthSize, y*mBeadWidthSize, mBeadWidthSize, mBeadWidthSize);
                    break;
            }

            ctx.closePath();
            ctx.fill();
            if(colors[mBeads.data[p]+"-"+mBeads.data[p+1]+"-"+mBeads.data[p+2]] === undefined)
                colors[mBeads.data[p]+"-"+mBeads.data[p+1]+"-"+mBeads.data[p+2]] = 0;
            colors[mBeads.data[p]+"-"+mBeads.data[p+1]+"-"+mBeads.data[p+2]]++;
        }
    }

    for (var k in colors){
        var index = k;
        var data = colors[k];
        $('#count-'+index).html(data);
    }
}

function loadImage(src){
    if(!src.type.match(/image.*/)) return;
    var reader = new FileReader();
    reader.onload = function(e){
	render(e.target.result);
    };
    reader.readAsDataURL(src);
}

mPalette = new Set();

function rgbStrToColor(s) {
    rgb = s.split(',');
    return {r: parseInt(rgb[0]), g: parseInt(rgb[1]), b: parseInt(rgb[2])};
}
function cssToRgbStr(elem, cssAttr) {
    var bg = elem.css(cssAttr);
    var start = bg.indexOf("(");
    var stop = bg.indexOf(")");
    var rgb = bg.substring(start+1,stop).replace(/\s/g, '');
    return rgb;
}

var zoomPosState = {
    move: false,
    startMoveX: 0,
    startMoveY: 0,
    beadsPosAtStartX: 0
};

function newImage(){
    $("#app-start").addClass("d-none");
    $("#app-new").removeClass("d-none").addClass("d-flex");
}

function readURL(input){
    $("#app-new").addClass("d-none").removeClass("d-flex");
    $("#app-canvas-container").removeClass("d-none");
    loadImage(input.files[0]);
}

$(function() {

    var colors;

    $( "#bead-count" ).change(function() {
        mBeadWidth = $(this).val();
        mUpdateBeads = true;
        renderBeads(true);
    });

    function updateColors(){
        if(localStorage.getItem("colors") === null){
            localStorage.setItem("colors", JSON.stringify([
                {"name":"White","red":255,"green":255,"blue":255},
                {"name":"Green","red":85,"green":187,"blue":81},
                {"name":"Purple","red":83,"green":42,"blue":92},
                {"name":"Light Brown","red":141,"green":76,"blue":48},
                {"name":"Dark Green","red":85,"green":187,"blue":81},
                {"name":"Orange","red":185,"green":59,"blue":44},
                {"name":"Yellow","red":212,"green":168,"blue":58},
                {"name":"Grey","red":190,"green":165,"blue":134},
                {"name":"Light Blue","red":33,"green":100,"blue":202},
                {"name":"Brown","red":156,"green":78,"blue":31},
                {"name":"Reddish Brown","red":228,"green":72,"blue":40},
                {"name":"Pastel Blue","red":110,"green":208,"blue":244},
                {"name":"Blue","red":10,"green":24,"blue":99},
                {"name":"Cream","red":252,"green":246,"blue":182},
                {"name":"Beige","red":192,"green":144,"blue":89},
                {"name":"White","red":205,"green":206,"blue":207},
                {"name":"Turquoise","red":80,"green":129,"blue":138},
                {"name":"Red","red":153,"green":45,"blue":55},
                {"name":"Light Green","red":75,"green":171,"blue":131},
                {"name":"Black","red":24,"green":26,"blue":29},
                {"name":"Pink","red":202,"green":112,"blue":123},
                {"name":"Flesh","red":197,"green":129,"blue":111},
                {"name":"Burgundy","red":92,"green":50,"blue":58},
                {"name":"Pastel Purple","red":125,"green":97,"blue":149},
                {"name":"Pastel Pink","red":182,"green":103,"blue":149},
                {"name":"Claret","red":157,"green":29,"blue":56},
                {"name":"Dark Red","red":130,"green":23,"blue":34},
                {"name":"Pastel Yellow","red":225,"green":204,"blue":60},
                {"name":"Pastel Red","red":197,"green":75,"blue":71},
                {"name":"Pastel Green","red":149,"green":186,"blue":100},
                {"name":"Azure","red":88,"green":168,"blue":188},
                {"name":"Teddybear Brown","red":215,"green":151,"blue":45}
            ]));
        }
        colors = JSON.parse(localStorage.getItem("colors"));

        colors.forEach(function(color) {
            mPalette.add(color.red+", "+color.green+", "+color.blue);
            $("#color-list").append("<div class='d-flex flex-row i-bg-light border-bottom' style='height: 50px;'><div class='d-flex px-1' style='background-color: rgb("+color.red+", "+color.green+", "+color.blue+");'></div><div id='count-"+color.red+"-"+color.green+"-"+color.blue+"' class='d-flex px-3' style='margin: auto;'>0</div><div class='d-flex flex-grow-1 px-3' style='margin: auto;'>"+color.name+"</div></div>");
        });
    }


    canvas = document.getElementById("canvas");

    ctx = canvas.getContext("2d");

    updateColors();

    $("[btn-mode]").click(function() {
        $("[btn-mode]").removeClass("btn-primary btn-light").addClass("btn-light");
        mode = parseInt($(this).addClass("btn-primary").removeClass("btn-light").attr("btn-mode"), 10);
        renderBeads();
    });
});

var toolbar = false;

function toggle(){
    toolbar = !toolbar;
    $("#app-container").toggleClass("d-none d-flex");
    $("#app-toolbar").toggleClass("d-none d-flex");
    $("#app-toolbar").css("width", toolbar ? "100vw" : "20vw");
}
