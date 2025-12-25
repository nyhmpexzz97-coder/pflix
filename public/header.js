const menuWrapper = document.querySelector('.menu-wrapper');
const lowerMain = document.querySelector('.lower_main');
const directions = document.querySelector('.directions');

let position = true;

menuWrapper.addEventListener('click', ()=>{
    if(position == true){
        lowerMain.style.height = "500px";
        setTimeout(() => {
        directions.style.display = "flex";
        }, 300);
        position = false;
    }
    else{
        directions.style.display = "none";
        lowerMain.style.height = "50px";
        position = true;
    }
})