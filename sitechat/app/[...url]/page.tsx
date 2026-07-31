interface PageProp{
    params : {
        url: string | string[] | undefined
    }
}

const Page = async ({params }: PageProp) => {

    const getParams = await params
    console.log(getParams)

return <>
    <p>Hello</p>
    </>
}

export default Page