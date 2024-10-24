import Color from 'color';
import { sendPlayerPosition, setUpdatePlayerPositions, setUpdatePlayerLeft, setUpdateConnection } from './socketIOcom';

var canvas;
var context;

var x;
var y;

var speed;
var dir;
var dirVel;
var turnSpeed;

var rad;

var lineWidth;

var color;
var otherColor;

var bitmap;

var alive;

var otherPos = new Map();
var userId;

var frame = 0;
var wrote = false;
var hasRead = false;
var connected = false;

const updatePlayerPositions = async (player) => {
    hasRead = true;
    setOther(player.id, player.x, player.y); 
};

const updatePlayerLeft = async (id) => {
    otherPos.delete(id);
}

const updateConnection = async (isConnected) => {
    connected = isConnected;
}

setUpdatePlayerPositions(updatePlayerPositions);
setUpdatePlayerLeft(updatePlayerLeft)
setUpdateConnection(updateConnection);

export async function init() {
    userId = generateUID();

    const app = document.querySelector('#app');
    canvas = document.getElementById("tailCanvas"); 
    context = canvas.getContext("2d"); 
    bitmap = context.createImageData(canvas.width, canvas.height);
    
    const black = Color.rgb(0, 0, 0);

    for (let j = 0; j < canvas.width; j++) {
        for (let i = 0; i < canvas.height; i++) {
            setPixel(bitmap, j, i, black);
        }
    }

    alive = true;
    
    speed = 1;
    turnSpeed = 0.07;
    dir = 0;
    dirVel = 0;
    rad = 5;

    lineWidth = 2;
    
    pickRandomColor();
    otherColor = Color.rgb(255, 0, 0);

    x = 100;
    y = 200;

    document.body.style.background = 'gray';

    // const textTag = document.createElement('p');
    // textTag.textContent = "AACHGUNT!";
    // app.appendChild(textTag);
    setInterval(draw, 1000/60);
}

export async function keyDown(key) {
    if (key == 'a' ||  key == 'A')
        dirVel = -turnSpeed;
    else if (key == 'd' || key == 'D')
        dirVel = turnSpeed;
    if (key == 'k' || key == 'K') {
        const checkX = x + Math.cos(dir)*rad;
        const checkY = y + Math.sin(dir)*rad;

        if (checkX <= 0) 
            dir = Math.PI-dir;
        else if (checkX >= canvas.height)
            dir = Math.PI*3-dir;
        else if (checkY <= 0 || checkY >= canvas.width)
            dir = -dir;

        while (checkCollision()) {
            x += Math.cos(dir)*rad/2;
            y += Math.sin(dir)*rad/2;
        }
        
        alive = true;
    }
}

export async function keyUp(key) {
    if ((key == 'a' ||  key == 'A') && dirVel < 0)
        dirVel = 0;
    else if ((key == 'd' || key == 'D') && dirVel > 0)
        dirVel = 0;
}

async function draw() { 
    context.clearRect(0, 0, canvas.width, canvas.height);
    setPixelsInCircle(bitmap, Math.floor(x), Math.floor(y), color, 2);
    context.putImageData(bitmap, 0, 0);
    context.fillStyle = "green";
    context.fillText("x = " + x, 10, 100);
    context.fillText("y = " + y, 10, 120);
    context.fillText("dir = " + dir, 10, 140);
    context.fillText("dirVel = " + dirVel, 10, 160);
    context.fillText("alive = " + alive, 10, 180);
    drawCircle(x, y, rad, color.hex());
    // context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (alive) {
        x += Math.cos(dir)*speed;
        y += Math.sin(dir)*speed;
        if (frame >= 60 && connected) {
            frame = 0;
            wrote = true;
            sendPlayerPosition(userId, x, y);
        }
    }
    dir += dirVel;
    var collision = checkCollision();
    context.fillText("colliding: " + collision, 10, 380);
    if (collision == true) {
        alive = false;
    }
    context.fillText("wrote: " + wrote, 10, 400);

    context.fillText("others exist: " + otherPos.size, 10, 420);

    context.fillText("has read: " + hasRead, 10, 440);
    
    context.fillText("frame % 60: " + frame, 10, 460);

    context.fillText("connected: " + connected, 10, 480);
    
    otherPos.forEach((key, value) => {
        setPixelsInCircle(bitmap, Math.floor(value.x), Math.floor(value.y), otherColor, 2);
    });
    frame += 1;
}

async function drawCircle(x, y, r, color) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = lineWidth;
    context.strokeStyle = '#ffffff';
    context.stroke();
}

async function setPixelsInCircle(image, x, y, color, rad) {
    for (let _x = Math.max(x - rad, 0); _x < Math.min(x + rad, image.width-1); _x++) 
        for (let _y = Math.max(y - rad, 0); _y < Math.min(y + rad, image.height-1); _y++) 
            if ((x-_x)*(x-_x) + (y-_y)*(y-_y) < rad*rad)
                setPixel(image, _x, _y, color);
}

async function setPixel(image, x, y, color) {
    var index = 4 * (x + y * image.width);
    image.data[index] = color.red();
    image.data[index+1] = color.green();
    image.data[index+2] = color.blue();
    image.data[index+3] = 255;
}

function getPixelEmpty(image, x, y){
    var index = 4 * (x + y * image.width);
    return image.data[index] == 0
        && image.data[index+1] == 0
        && image.data[index+2] == 0;
}

function checkCollision() {
    const checkX = x + Math.cos(dir)*rad;
    const checkY = y + Math.sin(dir)*rad;
    context.fillText("checkX = " + checkX, 10, 200);
    context.fillText("checkY = " + checkY, 10, 220);
    context.fillText("canvasWidth = " + canvas.width, 10, 240);
    context.fillText("canvasHeight = " + canvas.height, 10, 260);
    context.fillText("X >= width: " + (checkX >= canvas.width), 10, 280);
    context.fillText("Y >= height: " + (checkY >= canvas.height), 10, 300);
    context.fillText("X <= 0: " + (checkX <= 0), 10, 320);
    context.fillText("Y <= 0: " + (checkY <= 0), 10, 340);
    context.fillText("colliding with tail: " + !getPixelEmpty(bitmap, Math.round(checkX), Math.round(checkY)), 10, 360);
    return checkX <= 0 || checkX >= canvas.width || checkY <= 0 || checkY >= canvas.height
         || !getPixelEmpty(bitmap, Math.round(checkX), Math.round(checkY));
}

function pickRandomColor() {
    const hue = Math.random()*360;
    const S = 0.8;
    const V = 1;

    const C = S * V;
    const X = C * (1-Math.abs(hue/60 % 2 - 1));
    const m = V - C;

    var R, G, B;
    if (hue < 60) {
        R = C;
        G = X;
        B = 0;
    }
    else if (hue < 120) {
        R = X;
        G = C;
        B = 0;
    }
    else if (hue < 180) {
        R = 0;
        G = C;
        B = X;
    }
    else if (hue < 240) {
        R = 0;
        G = X;
        B = C;
    }
    else if (hue < 300) {
        R = X;
        G = 0;
        B = C;
    }
    else {
        R = C;
        G = 0;
        B = X;
    }


    color = Color.rgb(Math.round((R+m)*255), Math.round((G+m)*255), Math.round((B+m)*255));
    
}

function generateUID() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
 
async function setOther(otherUserId, x, y) {
    if (userId != otherUserId) {
        otherPos.set(userId, {x: x, y: y});
    }
}


