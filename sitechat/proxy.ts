// this is the middleware file

export const proxy = () => {

    // OverView check if the user is allowed to join room
    // If they are: Let them pass
    // If they are not: Send them back to Lobby/home

    

}



// This routes will only be used by this proxy file.
export const config ={
    matcher: "/room/:path*"
}