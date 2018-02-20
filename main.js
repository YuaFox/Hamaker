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
var mBeadWidth = $("#bead-count").val();
var mBeadWidthSize = 10;
var mBeads = null;
var mPosX = 0;
var mPosY = 0;
var mUpdateBeads = true;
var mDither = false;

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
	renderBeads(mPosX, mPosY);
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

function renderBeads(x, y) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);    
    colors = {};
    var palette = paletteToTyped(mPalette);
    if (mUpdateBeads) {
	mUpdateBeads = false;
	mBeads = toBeads(pixelsData, width, height, mBeadWidth);
	var beadHeight = getBeadHeight(mBeadWidth);
	colorReduce(mBeads.data, mBeadWidth, beadHeight, palette);	
    }
    var halfBeadWidthSize = mBeadWidthSize/2;
    var twoPi = 2*Math.PI;
    var xOffset = mPosX + halfBeadWidthSize;
    var yOffset = mPosY + halfBeadWidthSize;    
    for (var y = 0; y < mBeads.height; y++) {
	for (var x = 0; x < mBeads.width; x++) {
	    var p = (y * mBeads.width + x)*3;
            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + mBeads.data[p] + ',' + mBeads.data[p+1] + ',' + mBeads.data[p+2] + ",255)";
            ctx.arc(xOffset + x*mBeadWidthSize,
		    yOffset + y*mBeadWidthSize, halfBeadWidthSize,0, twoPi, true);
            ctx.closePath();
            ctx.fill(); 
            if(colors["rgb("+mBeads.data[p]+", "+mBeads.data[p+1]+", "+mBeads.data[p+2]+")"] === undefined)
                colors["rgb("+mBeads.data[p]+", "+mBeads.data[p+1]+", "+mBeads.data[p+2]+")"] = 0;
            colors["rgb("+mBeads.data[p]+", "+mBeads.data[p+1]+", "+mBeads.data[p+2]+")"]++;
        }
    }
    
    for (var k in colors){
        var index = k;
        var data = colors[k];
        $('li').filter(function(){
            var color = $(this).css("background-color");
            return color === index;
        }).children().html(data);
    }
}

function loadImage(src){
    //	Prevent any non-image file type from being read.
    if(!src.type.match(/image.*/)){
	return;
    }
    
    //	Create our FileReader and run the results through the render function.
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

$(function() {
    if(window.location.search === "?ad"){
        $("#ad").addClass("d-none");
        $("#main").removeClass("d-none");
    }
    
    var colors;
    
    $( "#bead-count" ).change(function() {
        mBeadWidth = $(this).val();
        mUpdateBeads = true;
        renderBeads(mPosX, mPosY);
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
            $("#color-list").append("<li class='list-group-item' style='background-color: rgb("+color.red+", "+color.green+", "+color.blue+");'><b class='count'>0</b> "+color.name+"</li>");
        });
    }

    
    canvas = document.getElementById("canvas");
    canvas.width = 1000;
    canvas.height = 600;
    $("#canvas").css("width", "100%");

    canvas.addEventListener('mousewheel',function(event){
	var rect = canvas.getBoundingClientRect();
	var x = event.clientX - rect.left;
	var y = event.clientY - rect.top;
	var beadCoordX = x - mPosX;
	var beadCoordY = y - mPosY;
        
	var relativeX = beadCoordX / (mBeadWidth * mBeadWidthSize);
	var relativeY = beadCoordY / (getBeadHeight(mBeadWidth) * mBeadWidthSize);
        
        var diff = 0.02;
        
	var inc = Math.round(event.deltaY*diff);
	var oldWidth = (mBeadWidth * mBeadWidthSize);
	var oldHeight = (getBeadHeight(mBeadWidth) * mBeadWidthSize);
	mBeadWidthSize = Math.max(mBeadWidthSize - inc,1);
	var newWidth = (mBeadWidth * mBeadWidthSize);
	var newHeight = (getBeadHeight(mBeadWidth) * mBeadWidthSize);

	mPosX += (relativeX) * (oldWidth - newWidth);
	mPosY += (relativeY) * (oldHeight - newHeight);	
	renderBeads(mPosX,mPosY);
	event.preventDefault();	
	return true; 
    }, false);
    
    canvas.addEventListener('mousemove', function(event){
	if (zoomPosState.move) {
	    var rect = canvas.getBoundingClientRect();
	    var x = event.clientX - rect.left;
	    var y = event.clientY - rect.top;
	    var dx = x - zoomPosState.startMoveX;
	    var dy = y - zoomPosState.startMoveY;	    
	    mPosX = zoomPosState.beadsPosAtStartX + dx;
	    mPosY = zoomPosState.beadsPosAtStartY + dy;
	    renderBeads(mPosX,mPosY);

	}
    });
    
    canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);    
    canvas.addEventListener('mouseup', function(event){
	zoomPosState.move = false;
    });
    canvas.addEventListener('mousedown', function(event){
	var rect = canvas.getBoundingClientRect();
	zoomPosState.move = true;
	zoomPosState.startMoveX = event.clientX - rect.left;
	zoomPosState.startMoveY = event.clientY - rect.top;
	zoomPosState.beadsPosAtStartX = mPosX;
	zoomPosState.beadsPosAtStartY = mPosY;	
    });
    
    ctx = canvas.getContext("2d");

    var upload_element = document.getElementById("drag-area");
    upload_element.addEventListener("dragover", function(e){
        e.preventDefault();
        $("body").removeClass("bg-dark");
        $(".text-white").addClass("text-dark").removeClass("text-white");
    }, true);
    upload_element.addEventListener("dragleave", function(e){
        e.preventDefault();
        $("body").addClass("bg-dark");
        $(".text-dark").addClass("text-white").removeClass("text-dark");
    }, true);
    
    upload_element.addEventListener("drop", function(e){
	e.preventDefault(); 
        $("body").addClass("bg-dark");
        $(".text-dark").addClass("text-white").removeClass("text-dark");
	loadImage(e.dataTransfer.files[0]);
        $("#main").addClass("d-none");
        $("#editor").removeClass("d-none");
        window.location.hash = '#editor';
    }, true);
    
    updateColors();
});