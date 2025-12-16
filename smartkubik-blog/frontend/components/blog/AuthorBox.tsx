import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const AuthorBox = ({ authorName, authorImage, authorBio }: { authorName: string, authorImage: string, authorBio: string }) => {
    if (!authorName) return null;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={authorImage} alt={authorName} />
                    <AvatarFallback>{authorName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-xl">{authorName}</CardTitle>
                    {authorBio && <CardDescription>{authorBio}</CardDescription>}
                </div>
            </CardHeader>
            {/* You could add social proof here, e.g., logos of clients, badges */}
            {/* <CardContent>
        <p className="text-sm text-muted-foreground">"Experto en gestión de inventarios con más de 10 años de experiencia."</p>
      </CardContent> */}
        </Card>
    );
};

export default AuthorBox;
