interface PageProp{
    params : {
        url: string | string[] | undefined
    }
}

const Page = ({params }: PageProp) => {
    console.log(params)

return <>
    <p>Hello</p>
    </>
}

export default Page