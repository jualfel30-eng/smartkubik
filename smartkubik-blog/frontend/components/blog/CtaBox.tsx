import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const CtaBox = ({ title, description, buttonText, href }: { title: string, description: string, buttonText: string, href: string }) => {
    return (
        <Card className="border-primary/50 bg-card">
            <CardHeader>
                <CardTitle className="text-foreground">{title}</CardTitle>
                <CardDescription className="text-muted-foreground">{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    <a href={href} target="_blank" rel="noopener noreferrer">{buttonText}</a>
                </Button>
            </CardContent>
        </Card>
    );
};

export default CtaBox;
