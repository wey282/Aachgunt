import Color from 'color';
import { sendPlayerPosition, setUpdatePlayerPositions, setUpdatePlayerLeft, setUpdateConnection, playerDied, setOnPlayerDeath } from './socketIOcom';

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
var points = 0;

var powerUps = [];

var tank = false;
var tankStart = 0;

var chair = false;

var types = ["TANK", "CHAIR"];

var chairs = [];

var WIDTH = 500;
var HEIGHT = 500;

const updatePlayerPositions = async (player) => {
    hasRead = true;
    setOther(player.id, player.x, player.y); 
};

const updatePlayerLeft = async (id) => {
    otherPos.delete(id);
};

const updateConnection = async (isConnected) => {
    connected = isConnected;
};

const onPlayerDeath = async () => {
    if (alive)
        points++;
};

setUpdatePlayerPositions(updatePlayerPositions);
setUpdatePlayerLeft(updatePlayerLeft)
setUpdateConnection(updateConnection);
setOnPlayerDeath(onPlayerDeath);

export async function init() {
    userId = generateUID();

    const app = document.querySelector('#app');
    canvas = document.getElementById("tailCanvas"); 
    context = canvas.getContext("2d");

    bitmap = context.createImageData(WIDTH, HEIGHT);
    
    const black = Color.rgb(0, 0, 0);

    for (let j = 0; j < WIDTH; j++) {
        for (let i = 0; i < HEIGHT; i++) {
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
        else if (checkX >= HEIGHT)
            dir = Math.PI*3-dir;
        else if (checkY <= 0 || checkY >= WIDTH)
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
    else if (key == 'space' || key == 'Space' || key == 'SPACE' || key == ' ') {
        if (tank) {
            x += Math.cos(dir) * 10;
            y += Math.sin(dir) * 10;
        }
        if (chair) {
            chair = false;
            chairs.push({x: x, y: y, dir: dir});
        }
    }
}

async function draw() { 
    context.clearRect(0, 0, WIDTH, HEIGHT);
    setPixelsInCircle(bitmap, Math.floor(x), Math.floor(y), color, 2);
    context.putImageData(bitmap, 0, 0);
    context.fillStyle = "green";
    context.fillText("x = " + x, 10, 100);
    context.fillText("y = " + y, 10, 120);
    context.fillText("dir = " + dir, 10, 140);
    context.fillText("dirVel = " + dirVel, 10, 160);
    context.fillText("alive = " + alive, 10, 180);
    drawCircle(x, y, rad, color.hex());
    // context.drawImage(bitmap, 0, 0, WIDTH, HEIGHT);
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
        if (alive) {
            points--;
            playerDied();
        }
        alive = false;
    }
    context.fillText("wrote: " + wrote, 10, 400);

    context.fillText("others exist: " + otherPos.size, 10, 420);

    context.fillText("has read: " + hasRead, 10, 440);
    
    context.fillText("frame % 60: " + frame, 10, 460);

    context.fillText("connected: " + connected, 10, 480);
    context.fillText("points: " + points, 400, 20);
    
    powerUps.forEach(powerUp => {
        switch (powerUp.type) {
            case "TANK": {
                drawImage("tankUp.png", 2*powerUp.r, 2*powerUp.r, powerUp.x, powerUp.y, 0);
                break;
            }
            case "CHAIR": {
                drawImage("chairUp.png", 2*powerUp.r, 2*powerUp.r, powerUp.x, powerUp.y, 0);
                break;
            }
        }
    });

    var deleteChairs = []; 
    chairs.forEach(chair => {
        chair.x += speed*3*Math.cos(chair.dir);
        chair.y += speed*3*Math.sin(chair.dir);
        if (chair.x < 0 || chair.x > WIDTH || chair.y < 0 || chair.y > HEIGHT) {
            deleteChairs.push(chair);
        }
        drawImage("chair.png", 30, 30, chair.x, chair.y, chair.dir);
    });
    chairs = chairs.filter(chair => !deleteChairs.includes(chair));

    otherPos.forEach((key, value) => {
        setPixelsInCircle(bitmap, Math.floor(value.x), Math.floor(value.y), otherColor, 2);
    });
    frame += 1;
    checkPowerups();

    if (tank) {
        drawImage("tank.png", 20, 20, x, y, dir);

        if (frame - tankStart > 60*15) {
            tank = false;
        } 
    }

    if (chair) {
        drawImage("chair.png", 30, 30, x-Math.cos(dir)*20, y-Math.sin(dir)*20, 0);
    }

    if (frame % 120 == 0 && Math.random() < 0.3) {
        powerUps.push({x: Math.random()*WIDTH, y: Math.random()*HEIGHT, r: 15, type: types[Math.floor(Math.random()*types.length)]});
    }
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
    context.fillText("canvasWidth = " + WIDTH, 10, 240);
    context.fillText("canvasHeight = " + HEIGHT, 10, 260);
    context.fillText("X >= width: " + (checkX >= WIDTH), 10, 280);
    context.fillText("Y >= height: " + (checkY >= HEIGHT), 10, 300);
    context.fillText("X <= 0: " + (checkX <= 0), 10, 320);
    context.fillText("Y <= 0: " + (checkY <= 0), 10, 340);
    context.fillText("colliding with tail: " + !getPixelEmpty(bitmap, Math.round(checkX), Math.round(checkY)), 10, 360);
    if (tank && !getPixelEmpty(bitmap, Math.round(checkX), Math.round(checkY))) {
        tankStart -= 50;
    }
    return checkX <= 0 || checkX >= WIDTH || checkY <= 0 || checkY >= HEIGHT
         || (!tank && !getPixelEmpty(bitmap, Math.round(checkX), Math.round(checkY)));
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

function checkPowerups() {
    if (!alive) {
        return;
    }
    var collected = [];
    powerUps.forEach(powerUp => {
        if ((x-powerUp.x)*(x-powerUp.x)+(y-powerUp.y)*(y-powerUp.y) < powerUp.r * powerUp.r) {
            collected.push(powerUp);

            switch(powerUp.type) {
                case "TANK": {
                    tank = true;
                    tankStart = frame;
                    break;
                }
                case "CHAIR": {
                    chair = true;
                    break;
                }
            }
        }
    });
    powerUps = powerUps.filter(powerUp => !collected.includes(powerUp));
}

function drawImage(src, sizeX, sizeY, x, y, rotation) {
    let img = new Image(sizeX, sizeY);
    img.src = src;

    // Save the rotation and translation
    context.save();

    // Draw the rotated image
    context.translate(x, y);
    context.rotate(rotation);
    context.drawImage(img, -sizeX/2, -sizeY/2, sizeX, sizeY);

    // Restore the rotation and translation
    context.restore();
    // context.translate(-200, 0);
};