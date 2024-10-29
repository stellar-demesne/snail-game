
const NO_ACTION = "act-none";
const EAT_ACTION = "act-eat";
const MOVE_ACTION = "act-move";
const WOOD_ACTION = "act-wood";
const PLATFORM_ACTION = "act-platform";


const INDEX_EAT = 0;
const INDEX_SEE_FOODSUPPLY = 1;
const INDEX_MOVE = 2;
const INDEX_FIND_FOOD = 3;
const INDEX_EXPLORE = 4;
const INDEX_SEE_WORLDSIZE = 5;
const INDEX_GATHER_WOOD = 6;
const INDEX_MOVE_PLATFORM = 7;
const INDEX_CROSS_EGGLINE = 8;
const INDEX_STRAWBERRY_HEAVEN = 9;

const GAME_FRAMETIME = 20; // 50fps?

const LOCALSTORAGE_SAVE_LOC = "snailSave";

var snail_state = {
    eat: 0,
}
function reset_state() {
    snail_state.action_unlocked = [true, false, false, false, false, false, false, false, false, false];
    snail_state.eat = 0;
    snail_state.eat_subticks = 0;
    snail_state.move = 0;
    snail_state.move_subticks = 0;
    snail_state.foodsources_found = 1;
    snail_state.foodsupply = 50;
    snail_state.woodgathered = 0;
    snail_state.wood_subticks = 0;
    snail_state.platform_position = 0;
    snail_state.current_action = NO_ACTION;
    snail_state.guidance_max = 0;
    snail_state.ticks_since_action = 0;
    snail_state.food_eaten_since_end = 0;

    set_current_action(NO_ACTION);
    snail_site.guidance_shown = 0;

    do_screen_update();
    update_guidance();
}


const snail_behaviour = {
    ticks_for_eat: 500,
    ticks_for_move: 1300,
    ticks_for_wood: 500,
    moves_for_foodsource: 25,
    foodsupply_per_foodsource: 60,
    platform_size: 120,
    platform_distance_needed: 250,
    worldsize_max: 200,
    eggline: 180,
}

var snail_site = {
    guidance_shown: 0,
    guidance: [
        "You are a snail. But what is a snail? You should ponder this. <em>Be</em> the snail within yourself.<br>It probably involves eating, right?",
        "Wow, this food really does taste very good. It would be horrible if it ran out, wouldn't it.",
        "You are a snail. You have - and are - a footstomach. You can eat to move more, or move to eat more. ...Life is pretty sweet. No need to move with all this food right here, though.",
        "Dire catastrophe! Your succulent foodsource has run out... but maybe if you try to move with a bit of purpose, you'll find more?",
        "Yep, that definitely worked. A big ol' fruit, ripe for the eating. Glorious.",
        "Y'know, you <em>have</em> eyes. They're useful for more than just seeing if there's food in front of you. Time to get looking around this place! Knowing where to find food doesn't mean you shouldn't look around!",
        "Welp, that's definitely the width and breadth of the land that you've seen. Plenty more to see in here, to be sure, but now you know how much you've got to deal with.",
        "In the distance, you can see a clear white line on the ground. It looks unsettling. You feel very unsettled. But you're not there yet, so...",
        "You have arrived. That distant white line, now revealed just inches away, is enough to make your shell shiver, for it is <strong>Eggshells</strong>, that evillest of substances.",
        "It is not only a line - it is a warding wall. And it surrounds a patch of <strong>strawberries</strong>. You need to figure something out. This is dire. Strawberries must be eaten!",
        "Your snail brain may be relatively simple... but it isn't useless! You can do this. What you need is <em>stilts</em>. Or something. Time to gather some woody plantmatter!",
        "It is really hard to manipulate this stuff with only your trusty footstomach. It really might've been nice to have hands or something. But you still do have muscle. It works.",
        `You've managed to get a good platform together. Time to get it in place! It's a big day for snailkind - or, to quote: "That's one small footmove for stomachs, one giant leap for footstomachkind" ~ Sneil Shellstrong.`,
        "It's in place! Eggshell wall defeated! Strawberry heaven is just inches away!",
        "Wow, so much food. Time to get chowing down on this stuff, before someone else uses your clever bridge!",
        "That's all the game. Thanks for playing~. Be kind to others, and chase your dreams! I believe in you <3"
              ],
}

function change_guidance_first() {
    snail_site.guidance_shown = 0;
}
function change_guidance_prev() {
    snail_site.guidance_shown -= 1;
    if (snail_site.guidance_shown < 0) {
        snail_site.guidance_shown = 0;
    }
}
function change_guidance_next() {
    snail_site.guidance_shown += 1;
    if (snail_site.guidance_shown > snail_state.guidance_max) {
        snail_site.guidance_shown = snail_state.guidance_max;
    }
}
function change_guidance_last() {
    snail_site.guidance_shown = snail_state.guidance_max;
}

function set_current_action(act) {
    let elem = document.querySelector("#" + act);
    elem.checked = true;
}

function save_to_localStorage() {
    let savestate = snail_state;
    savestate.save_time = Date.now();
    let savegame = JSON.stringify(snail_state)
    try {
        localStorage.setItem(LOCALSTORAGE_SAVE_LOC, savegame);
    }
    catch (e) {
        console.warn("SAVE FAILED!");
    }
}

function load_from_localStorage() {
    let stored_data = localStorage.getItem(LOCALSTORAGE_SAVE_LOC);
    if (stored_data === null) {
        console.log("no save detected");
    }
    else {
        if (queued_action_id !== null) {
            window.cancelAnimationFrame(queued_action_id);
        }
        let stored_state = JSON.parse(stored_data);
        reset_state();
        let saved_time = stored_state.save_time;
        let now_time = Date.now();
        console.log("catching up: ", now_time - saved_time);
        delete stored_state.save_time;
        snail_state = stored_state;
        set_current_action(snail_state.current_action);

        last_seen_timestamp = saved_time;
        runGame(now_time, requeue=false);
        last_seen_timestamp = document.timeline.currentTime;
        queued_action_id = window.requestAnimationFrame(runGame);
        snail_site.guidance_shown = snail_state.guidance_max
        do_screen_update();
        update_guidance();
    }
}

function assign_current_action() {
    let elem = document.querySelector("#actions-pane :checked");
    if (!elem) {
        snail_state.current_action = NO_ACTION;
    }
    else {
        snail_state.current_action = elem.id
    }
}

function take_current_action() {
    let can_eat = false;
    if (snail_state.foodsupply >= 1) {
        can_eat = true;
    }
    if (snail_state.action_unlocked[INDEX_STRAWBERRY_HEAVEN]) {
        can_eat = true;
    }
    let can_move = true;
    if (snail_state.move >= snail_behaviour.worldsize_max) {
        can_move = false;
    }
    if (snail_state.move >= snail_behaviour.eggline && !snail_state.action_unlocked[INDEX_CROSS_EGGLINE]) {
        can_move = false;
    }
    if (snail_state.current_action === EAT_ACTION) {
        if (can_eat) {
            snail_state.eat_subticks += 10;
        }
    }
    else if (snail_state.current_action === MOVE_ACTION) {
        // if moving is blocked (by eggwall or worldlimit), then no.
        if (can_move) {
            if (snail_state.action_unlocked[INDEX_EXPLORE]) {
                snail_state.move_subticks += 15;
            }
            else if (snail_state.foodsupply < 1) {
                snail_state.move_subticks += 10;
            }
            else {
                snail_state.move_subticks += 0.5;
            }
        }
    }
    else if (snail_state.current_action === WOOD_ACTION) {
        snail_state.wood_subticks += 25;
    }
    else if (snail_state.current_action === PLATFORM_ACTION) {
        if (snail_state.platform_position < snail_behaviour.platform_distance_needed) {
            snail_state.platform_position += 0.5;
        }
    }
    else if (snail_state.current_action === NO_ACTION) {
        if (can_eat) {
            snail_state.eat_subticks += 0.125;
        }
        if (can_move && snail_state.action_unlocked[INDEX_MOVE]) {
            snail_state.move_subticks += 0.125;
        }
        if (snail_state.action_unlocked[INDEX_GATHER_WOOD]) {
            snail_state.wood_subticks += 0.25;
        }
    }
    if (snail_state.eat_subticks > snail_behaviour.ticks_for_eat) {
        snail_state.eat += 1;
        snail_state.foodsupply -= 1;
        snail_state.eat_subticks -= snail_behaviour.ticks_for_eat;
        if (snail_state.move >= snail_behaviour.worldsize_max) {
            snail_state.food_eaten_since_end += 1;
        }
    }
    if (snail_state.move_subticks > snail_behaviour.ticks_for_move) {
        snail_state.move += 1;
        if (snail_state.action_unlocked[INDEX_FIND_FOOD]) {
            if (snail_state.move >= snail_state.foodsources_found * snail_behaviour.moves_for_foodsource) {
                snail_state.foodsupply += snail_behaviour.foodsupply_per_foodsource;
                snail_state.foodsources_found += 1;
            }
        }
        snail_state.move_subticks -= snail_behaviour.ticks_for_move;
    }
    if (snail_state.wood_subticks > snail_behaviour.ticks_for_wood) {
        snail_state.woodgathered += 1;
        snail_state.wood_subticks -= snail_behaviour.ticks_for_wood;
    }
}

function do_mechanic_unlocks() {
    if (snail_state.guidance_max === 0) {
        if (snail_state.eat >= 20) {
            snail_state.action_unlocked[INDEX_SEE_FOODSUPPLY] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 1) {
        if (snail_state.eat >= 34) {
            snail_state.action_unlocked[INDEX_MOVE] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 2) {
        if (snail_state.foodsupply === 0) {
            snail_state.action_unlocked[INDEX_FIND_FOOD] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 3) {
        if (snail_state.foodsupply > 0) {
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 4) {
        if (snail_state.eat >= 65) {
            snail_state.action_unlocked[INDEX_EXPLORE] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 5) {
        if (snail_state.move > 40) {
            snail_state.action_unlocked[INDEX_SEE_WORLDSIZE] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 6) {
        if (snail_state.move >= 160) {
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 7) {
        if (snail_state.move >= snail_behaviour.eggline - 10) {
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 8) {
        if (snail_state.move >= snail_behaviour.eggline - 5) {
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 9) {
        if (snail_state.move >= snail_behaviour.eggline) {
            snail_state.action_unlocked[INDEX_GATHER_WOOD] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 10) {
        if (snail_state.woodgathered >= snail_behaviour.platform_size / 2) {
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 11) {
        if (snail_state.woodgathered >= snail_behaviour.platform_size) {
            snail_state.action_unlocked[INDEX_MOVE_PLATFORM] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 12) {
        if (snail_state.platform_position >= snail_behaviour.platform_distance_needed) {
            snail_state.action_unlocked[INDEX_CROSS_EGGLINE] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 13) {
        if (snail_state.move >= snail_behaviour.worldsize_max) {
            snail_state.action_unlocked[INDEX_STRAWBERRY_HEAVEN] = true;
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
    if (snail_state.guidance_max === 14) {
        // how much post-strawberry chewing do we really expect?
        if (snail_state.food_eaten_since_end > 20) {
            snail_state.guidance_max += 1;
            snail_site.guidance_shown = snail_state.guidance_max;
            update_guidance();
        }
    }
}

function update_guidance() {
    let elem = document.querySelector("#guidance");
    elem.innerHTML = snail_site.guidance[snail_site.guidance_shown];
}

function do_screen_update() {
    if (snail_state.action_unlocked[INDEX_EAT]) {
        elem = document.querySelector("#eat-pane");
        elem.setAttribute('style', "display: grid");
        elem = document.querySelector("#eat-amount");
        elem.innerHTML = snail_state.eat;
        elem = document.querySelector("#eat-progress");
        elem.setAttribute('style', "width: " + Math.min(1, snail_state.eat_subticks / snail_behaviour.ticks_for_eat) * 100 + "%");
    }
    else {
        elem = document.querySelector("#eat-pane");
        elem.setAttribute('style', "display: none");
    }
    if (snail_state.action_unlocked[INDEX_SEE_FOODSUPPLY]) {
        elem = document.querySelector("#foodsupply-holder");
        elem.setAttribute('style', "display: inline");
        elem = document.querySelector("#foodsupply");
        if (snail_state.action_unlocked[INDEX_STRAWBERRY_HEAVEN]) {
            elem.innerHTML = "&infin;"
        }
        else {
            elem.innerHTML = snail_state.foodsupply;
        }
    }
    else {
        elem = document.querySelector("#foodsupply-holder");
        elem.setAttribute('style', "display: none");
    }
    if (snail_state.action_unlocked[INDEX_MOVE]) {
        elem = document.querySelector("#move-pane");
        elem.setAttribute('style', "display: grid");
        elem = document.querySelector("#move-amount");
        elem.innerHTML = snail_state.move;
        elem = document.querySelector("#move-progress");
        elem.setAttribute('style', "width: " + Math.min(1, snail_state.move_subticks / snail_behaviour.ticks_for_move) * 100 + "%");
    }
    else {
        elem = document.querySelector("#move-pane");
        elem.setAttribute('style', "display: none");
    }
    if (snail_state.action_unlocked[INDEX_SEE_WORLDSIZE] || snail_state.action_unlocked[INDEX_EXPLORE]) {
        elem = document.querySelector("#worldsize-holder");
        elem.setAttribute('style', "display: inline");
        elem = document.querySelector("#worldsize");
        if (snail_state.action_unlocked[INDEX_SEE_WORLDSIZE]) {
            elem.innerHTML = snail_behaviour.worldsize_max;
        }
        else {
            elem.innerHTML = "?";
        }
    }
    else {
        elem = document.querySelector("#worldsize-holder");
        elem.setAttribute('style', "display: none");
    }
    if (snail_state.action_unlocked[INDEX_FIND_FOOD]) {
        elem = document.querySelector("#find-food-pane");
        elem.setAttribute('style', "display: grid");
        elem = document.querySelector("#find-food-amount");
        elem.innerHTML = snail_state.foodsources_found;
        elem = document.querySelector("#find-food-progress");
        let previous_food_dists = (snail_state.foodsources_found - 1) * snail_behaviour.moves_for_foodsource;
        let current_food_dist = snail_state.move - previous_food_dists
        elem.setAttribute('style', "width: " + Math.min(1, current_food_dist / snail_behaviour.moves_for_foodsource) * 100 + "%");
    }
    else {
        elem = document.querySelector("#find-food-pane");
        elem.setAttribute('style', "display: none");
    }
    if (snail_state.action_unlocked[INDEX_GATHER_WOOD]) {
        elem = document.querySelector("#wood-pane");
        elem.setAttribute('style', "display: grid");
        elem = document.querySelector("#wood-amount");
        elem.innerHTML = snail_state.woodgathered;
        elem = document.querySelector("#wood-progress");
        elem.setAttribute('style', "width: " + Math.min(1, snail_state.wood_subticks / snail_behaviour.ticks_for_wood) * 100 + "%");

        elem = document.querySelector("#platform-made-pane");
        elem.setAttribute('style', "display: grid");
        elem = document.querySelector("#platform-made-progress");
        elem.setAttribute('style', "width: " + Math.min(1, snail_state.woodgathered / snail_behaviour.platform_size) * 100 + "%");
        if (snail_state.woodgathered >= snail_behaviour.platform_size) {
            elem.setAttribute('class', 'progressbar complete');
        }
        else {
            elem.setAttribute('class', 'progressbar');
        }
    }
    else {
        elem = document.querySelector("#wood-pane");
        elem.setAttribute('style', "display: none");
        elem = document.querySelector("#platform-made-pane");
        elem.setAttribute('style', "display: none");
    }
    if (snail_state.action_unlocked[INDEX_MOVE_PLATFORM]) {
        elem = document.querySelector("#platform-moved-pane");
        elem.setAttribute('style', "display: grid");
        elem = document.querySelector("#platform-moved-visual");
        let platform_amount = snail_state.platform_position / snail_behaviour.platform_distance_needed
        elem.setAttribute('style', "margin-left: " + Math.min(1, platform_amount) * 95 + "%");
        elem = document.querySelector("#platform-amount");
        elem.innerHTML = Math.round(Math.min(1, platform_amount) * 100);
    }
    else {
        elem = document.querySelector("#platform-moved-pane");
        elem.setAttribute('style', "display: none");
    }
    elem = document.querySelector("#next-guidance");
    elem.disabled = (snail_site.guidance_shown === snail_state.guidance_max);
    elem = document.querySelector("#last-guidance");
    elem.disabled = (snail_site.guidance_shown >= snail_state.guidance_max - 1);
    elem = document.querySelector("#prev-guidance");
    elem.disabled = (snail_site.guidance_shown === 0);
    elem = document.querySelector("#first-guidance");
    elem.disabled = (snail_site.guidance_shown <= 1);
    elem = document.querySelector("#guidance-page-display");
    elem.innerHTML = (snail_site.guidance_shown + 1) + " / " + (snail_state.guidance_max + 1)
}


var last_seen_timestamp = 0;
var queued_action_id = null;

function runGame(timestamp, requeue=true) {
    if (timestamp != null) {
        snail_state.ticks_since_action += timestamp - last_seen_timestamp;
        last_seen_timestamp = timestamp;
        let frames = 0;
        while (snail_state.ticks_since_action >= GAME_FRAMETIME) {
            snail_state.ticks_since_action -= GAME_FRAMETIME;
            take_current_action();
            frames += 1;
        }
        if (frames > 0) {
            do_mechanic_unlocks();
            do_screen_update();
        }
    }
    assign_current_action();
    if (requeue) {
        queued_action_id = window.requestAnimationFrame(runGame);
    }
}

reset_state();
window.requestAnimationFrame(runGame);
